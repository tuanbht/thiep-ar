-- Cards filed by category and found by full-text search.
--   categories          the shelf's filters, in shelf order; a card can be in several
--   product_categories  which card is in which category
--   products.tags       words a buyer might search for
--   products.search     the card's searchable text (name, tags, its categories' names, blurb), lowercase and without
--                       diacritics, so "tinh yeu" finds "Tình yêu"; triggers keep it fresh
-- search_products() is the shelf's query; shelf_categories() lists the categories that have cards on sale.

create extension if not exists unaccent with schema extensions;

-- lowercase without diacritics ("Đà Lạt" -> "da lat"). Stable, as unaccent is: products.search is computed from it
-- when a row is written (triggers below), so a change to unaccent's rules would need that column rebuilt
create function public.fold(t text) returns text
language sql stable parallel safe strict set search_path = ''
as $$ select pg_catalog.lower(extensions.unaccent('extensions.unaccent'::regdictionary, t)) $$;

-- the words of a text as search sees them: folded, split on anything but letters and digits ("20/10" -> "20 10"), the
-- same for a card's text and for what a buyer types
create function public.search_words(t text) returns text
language sql stable parallel safe strict set search_path = ''
as $$ select pg_catalog.regexp_replace(public.fold(t), '[^a-z0-9]+', ' ', 'g') $$;

create table public.categories (
  id    text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  name  text not null check (length(name) between 1 and 60),
  blurb text check (blurb is null or length(blurb) <= 200),
  sort  integer not null default 0
);

create table public.product_categories (
  product_id  text not null references public.products (id) on delete cascade,
  category_id text not null references public.categories (id) on delete cascade,
  primary key (product_id, category_id)
);
create index product_categories_category_idx on public.product_categories (category_id);

alter table public.products
  add column tags text[] not null default '{}' check (cardinality(tags) <= 20),
  add column search tsvector not null default ''::tsvector;
create index products_search_idx on public.products using gin (search);

-- the card's searchable text: its name counts most, then its tags and categories, then its blurb
create function public.product_search_doc(p_id text, p_name text, p_blurb text, p_tags text[])
returns tsvector language sql stable set search_path = ''
as $$
  select setweight(to_tsvector('simple', public.search_words(p_name)), 'A')
      || setweight(to_tsvector('simple', public.search_words(array_to_string(p_tags, ' '))), 'B')
      || setweight(to_tsvector('simple', public.search_words(coalesce((
           select string_agg(c.name, ' ') from public.product_categories pc join public.categories c on c.id = pc.category_id
            where pc.product_id = p_id), ''))), 'B')
      || setweight(to_tsvector('simple', public.search_words(coalesce(p_blurb, ''))), 'C')
$$;

create function public.products_set_search() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.search := public.product_search_doc(new.id, new.name, new.blurb, new.tags);
  return new;
end $$;
create trigger products_search before insert or update of id, name, blurb, tags on public.products
  for each row execute function public.products_set_search();

-- a card joined or left a category: its searchable text names its categories
create function public.product_categories_refresh() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op <> 'DELETE' then
    update public.products p set search = public.product_search_doc(p.id, p.name, p.blurb, p.tags) where p.id = new.product_id;
  end if;
  if tg_op <> 'INSERT' then
    update public.products p set search = public.product_search_doc(p.id, p.name, p.blurb, p.tags) where p.id = old.product_id;
  end if;
  return null;
end $$;
create trigger product_categories_search after insert or update or delete on public.product_categories
  for each row execute function public.product_categories_refresh();

-- a category was renamed: so is it in its cards' searchable text
create function public.categories_refresh() returns trigger
language plpgsql set search_path = ''
as $$
begin
  update public.products p set search = public.product_search_doc(p.id, p.name, p.blurb, p.tags)
   where p.id in (select pc.product_id from public.product_categories pc where pc.category_id = new.id);
  return null;
end $$;
create trigger categories_search after update of name on public.categories
  for each row execute function public.categories_refresh();

-- What the buyer typed, as a query: every word must match the start of a word in the card, accents optional
-- ("tinh yeu" finds "Tình yêu", "sao ba" finds "sao băng"). Null when nothing searchable was typed.
create function public.search_query(p_text text) returns tsquery
language sql stable parallel safe set search_path = ''
as $$
  select case when count(*) = 0 then null else to_tsquery('simple', string_agg(w || ':*', ' & ')) end
    from (select w from regexp_split_to_table(public.search_words(left(coalesce(p_text, ''), 100)), ' ') as w
           where w <> '' limit 8) words
$$;

-- The shelf: the cards on sale that match the words typed and the category picked (either may be null), best match
-- first, then in shelf order. Each comes with its categories. Accents are optional, so "mua" also finds "múa"; a card
-- with the words exactly as typed, accents and all, ranks above one that only matches without them.
create function public.search_products(p_query text default null, p_category text default null)
returns table (id text, template text, design text, name text, blurb text, kind text, price_vnd integer, active boolean,
               sort integer, tags text[], categories text[], rank real)
language sql stable set search_path = ''
as $$
  with q as materialized (                                              -- once per search, not once per card
    select public.search_query(p_query) as tsq, pg_catalog.lower(pg_catalog.btrim(left(coalesce(p_query, ''), 100))) as typed)
  select p.id, p.template, p.design, p.name, p.blurb, p.kind, p.price_vnd, p.active, p.sort, p.tags,
         coalesce((select array_agg(pc.category_id order by c.sort, c.id)
                     from public.product_categories pc join public.categories c on c.id = pc.category_id
                    where pc.product_id = p.id), '{}'),
         case when q.tsq is null then 0
              else ts_rank(p.search, q.tsq)
                 + case when char_length(q.typed) > 1 and strpos(pg_catalog.lower(concat_ws(' ', p.name, array_to_string(p.tags, ' '), p.blurb)), q.typed) > 0
                        then 1 else 0 end
         end::real
    from public.products p cross join q
   where p.active
     and (q.tsq is null or p.search @@ q.tsq)
     and (p_category is null or exists (select 1 from public.product_categories pc
                                         where pc.product_id = p.id and pc.category_id = p_category))
   order by 12 desc, p.sort, p.id
$$;

-- The categories that have cards on sale, in shelf order, with how many.
create function public.shelf_categories()
returns table (id text, name text, blurb text, sort integer, products integer)
language sql stable set search_path = ''
as $$
  select c.id, c.name, c.blurb, c.sort, count(*)::integer
    from public.categories c
    join public.product_categories pc on pc.category_id = c.id
    join public.products p on p.id = pc.product_id and p.active
   group by c.id
   order by c.sort, c.id
$$;

-- the products already on sale get their searchable text now (later writes keep it fresh)
update public.products set search = public.product_search_doc(id, name, blurb, tags);

-- only the server, as everywhere: RLS on with no policies, no grants for the public roles; the server's role is granted
-- outright, not left to the project's defaults for new tables
alter table public.categories enable row level security;
alter table public.product_categories enable row level security;
revoke all on public.categories, public.product_categories from anon, authenticated;
grant select, insert, update, delete on public.categories, public.product_categories to service_role;
revoke execute on function public.fold(text), public.search_words(text), public.product_search_doc(text, text, text, text[]), public.products_set_search(),
  public.product_categories_refresh(), public.categories_refresh(), public.search_query(text), public.search_products(text, text),
  public.shelf_categories() from public, anon, authenticated;
grant execute on function public.fold(text), public.search_words(text), public.product_search_doc(text, text, text, text[]), public.search_query(text),
  public.search_products(text, text), public.shelf_categories() to service_role;
