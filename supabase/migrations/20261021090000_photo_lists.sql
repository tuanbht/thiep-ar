-- A card keeps a list of photos (content.photoPaths); a card kept before photo lists has one (content.photoPath).
-- cleanup_abandoned now returns the photos of the cards it removes kept either way, and photos_in_use tells which
-- photos a card left still shows: the nightly cleanup (lib/db/cleanup.ts) deletes a photo only when none does.
--
-- Rolling the app back to a build from before photo lists: switch the nightly cleanup off first. That build reads only
-- content.photoPath, so it would take the photos of every card kept as a list for unused, paid cards' too.

-- every photo a card's content names, whichever way it keeps them
create function public.content_photos(c jsonb) returns setof text
language sql immutable parallel safe set search_path = ''
as $$
  select c ->> 'photoPath' where c ->> 'photoPath' is not null
  union
  select jsonb_array_elements_text(case when jsonb_typeof(c -> 'photoPaths') = 'array' then c -> 'photoPaths' else '[]'::jsonb end)
$$;

create or replace function public.cleanup_abandoned(p_older_than interval default interval '24 hours')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - p_older_than;
  v_orders integer;
  v_photos text[];
  v_cards integer;
begin
  if p_older_than < interval '1 hour' then
    raise exception 'cleanup_abandoned: keep at least an hour of pending orders' using errcode = '22023';
  end if;

  delete from public.orders o
   where o.status = 'pending'
     and o.created_at < v_cutoff
     and not exists (select 1 from public.payments p where p.order_id = o.id);
  get diagnostics v_orders = row_count;

  with gone as (
    delete from public.gift_cards g
     where g.status = 'draft'
       and g.created_at < v_cutoff
       and not exists (select 1 from public.orders o where o.gift_card_id = g.id)
    returning g.content
  ), photos as (
    select distinct p from gone cross join lateral public.content_photos(gone.content) as p
  )
  select (select coalesce(array_agg(p), '{}') from photos), (select count(*)::integer from gone)
    into v_photos, v_cards;

  return jsonb_build_object('orders', v_orders, 'gift_cards', v_cards, 'photos', to_jsonb(v_photos));
end;
$$;

-- which of these photos a gift card (draft or paid) still shows: asked for a page of photos at once
create function public.photos_in_use(p_paths text[]) returns text[]
language sql stable set search_path = ''
as $$
  select coalesce(array_agg(distinct p), '{}')
  from public.gift_cards g cross join lateral public.content_photos(g.content) as p
  where p = any (p_paths)
$$;

revoke execute on function public.content_photos(jsonb), public.photos_in_use(text[]) from public, anon, authenticated;
grant execute on function public.content_photos(jsonb), public.photos_in_use(text[]) to service_role;
