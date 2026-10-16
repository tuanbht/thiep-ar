-- The gift-card platform: what is sold, what buyers write, what they buy, what recipients open, and what we count.
-- Only the server reads and writes: RLS is on everywhere with no policies, and anon/authenticated have no grants, so
-- just the secret (service_role) key works. A payment confirms an order through one function, confirm_order_payment.

create type public.order_status as enum ('pending', 'paid', 'failed', 'cancelled', 'refunded');
create type public.gift_status as enum ('draft', 'active', 'disabled');

-- updated_at follows every change
create function public.set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- what is sold: a template (and optionally one printed design of it) at a price
create table public.products (
  id         text primary key check (id ~ '^[a-z0-9][a-z0-9_-]*$'),
  template   text not null check (template ~ '^[a-z0-9][a-z0-9_-]*$'),
  design     text check (design is null or design ~ '^[a-z0-9][a-z0-9_-]*$'),
  name       text not null check (length(name) between 1 and 120),
  blurb      text check (blurb is null or length(blurb) <= 300),
  kind       text not null check (kind in ('3d', 'film')),
  price_vnd  integer not null check (price_vnd >= 0),
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_shelf_idx on public.products (active, sort, id);
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

-- what the recipient opens at /g/<slug>; it opens once its order is paid (status active)
create table public.gift_cards (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[A-Za-z0-9]{8,32}$'),
  product_id   text not null references public.products (id),
  template     text not null check (template ~ '^[a-z0-9][a-z0-9_-]*$'),
  design       text check (design is null or design ~ '^[a-z0-9][a-z0-9_-]*$'),
  content      jsonb not null check (jsonb_typeof(content) = 'object'),
  status       public.gift_status not null default 'draft',
  activated_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index gift_cards_product_id_idx on public.gift_cards (product_id);
create trigger gift_cards_updated_at before update on public.gift_cards for each row execute function public.set_updated_at();

-- what the buyer bought; the access token itself lives only in the buyer's cookie
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique check (length(code) between 4 and 40),
  gift_card_id      uuid not null references public.gift_cards (id),
  product_id        text not null references public.products (id),
  amount_vnd        integer not null check (amount_vnd >= 0),
  status            public.order_status not null default 'pending',
  buyer_name        text check (buyer_name is null or length(buyer_name) <= 120),
  buyer_email       text check (buyer_email is null or length(buyer_email) <= 254),
  buyer_phone       text check (buyer_phone is null or length(buyer_phone) <= 32),
  access_token_hash text not null check (length(access_token_hash) between 32 and 128),
  payment_provider  text check (payment_provider is null or payment_provider in ('test', 'zalopay')),
  payment_ref       text check (payment_ref is null or length(payment_ref) <= 128),
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_gift_card_id_idx on public.orders (gift_card_id);
create index orders_status_created_idx on public.orders (status, created_at);
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

-- every confirmed payment, with what the provider sent
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id),
  provider     text not null check (provider in ('test', 'zalopay')),
  provider_ref text not null check (length(provider_ref) between 1 and 128),
  amount_vnd   integer not null check (amount_vnd >= 0),
  status       text not null check (status in ('succeeded', 'failed')),
  raw          jsonb,
  created_at   timestamptz not null default now()
);
create index payments_order_id_idx on public.payments (order_id);
-- one provider payment pays one order
create unique index payments_provider_ref_succeeded_idx on public.payments (provider, provider_ref) where status = 'succeeded';

-- what we count, for stats later
create table public.events (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  name         text not null check (length(name) between 1 and 64),
  session_id   text check (session_id is null or length(session_id) <= 64),
  gift_card_id uuid references public.gift_cards (id) on delete set null,
  order_id     uuid references public.orders (id) on delete set null,
  product_id   text check (product_id is null or length(product_id) <= 64),
  props        jsonb not null default '{}'::jsonb check (jsonb_typeof(props) = 'object'),
  user_agent   text check (user_agent is null or length(user_agent) <= 512),
  referrer     text check (referrer is null or length(referrer) <= 2048)
);
create index events_name_occurred_at_idx on public.events (name, occurred_at);
create index events_gift_card_id_idx on public.events (gift_card_id);

-- only the server: RLS on with no policies, and no grants for the public roles
alter table public.products enable row level security;
alter table public.gift_cards enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.events enable row level security;
revoke all on public.products, public.gift_cards, public.orders, public.payments, public.events from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- A payment confirms its order: in one transaction the order becomes paid, its gift card active, and the payment is
-- recorded. The same provider reference again is a repeat (a provider calling back twice): nothing changes and
-- already_paid is true. Errors (SQLSTATE): GC404 no such order, GC409 not pending / paid by another payment / the
-- reference already paid another order, GC422 the amount differs, GC500 the order has no gift card.
create function public.confirm_order_payment(
  p_order_id uuid,
  p_provider text,
  p_ref      text,
  p_amount   integer,
  p_raw      jsonb,
  p_paid_at  timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o   public.orders;
  g   public.gift_cards;
  pay public.payments;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception using errcode = 'GC404', message = format('no order %s', p_order_id);
  end if;
  select * into g from public.gift_cards where id = o.gift_card_id for update;
  if not found then
    raise exception using errcode = 'GC500', message = format('order %s has no gift card', o.code);
  end if;

  if o.status = 'paid' then
    select * into pay from public.payments
      where order_id = o.id and provider = p_provider and provider_ref = p_ref and status = 'succeeded'
      limit 1;
    if found then
      return jsonb_build_object('order', to_jsonb(o), 'gift_card', to_jsonb(g), 'payment', to_jsonb(pay), 'already_paid', true);
    end if;
    raise exception using errcode = 'GC409', message = format('order %s is already paid', o.code);
  end if;
  if o.status <> 'pending' then
    raise exception using errcode = 'GC409', message = format('order %s is %s', o.code, o.status);
  end if;
  if p_amount is distinct from o.amount_vnd then
    raise exception using errcode = 'GC422', message = format('order %s costs %s VND, not %s', o.code, o.amount_vnd, p_amount);
  end if;
  if exists (select 1 from public.payments where provider = p_provider and provider_ref = p_ref and status = 'succeeded') then
    raise exception using errcode = 'GC409', message = format('payment %s %s already paid another order', p_provider, p_ref);
  end if;

  insert into public.payments (order_id, provider, provider_ref, amount_vnd, status, raw)
    values (o.id, p_provider, p_ref, p_amount, 'succeeded', p_raw)
    returning * into pay;
  update public.orders
    set status = 'paid', paid_at = p_paid_at, payment_provider = p_provider, payment_ref = p_ref
    where id = o.id
    returning * into o;
  update public.gift_cards
    set status = 'active', activated_at = p_paid_at
    where id = g.id
    returning * into g;
  return jsonb_build_object('order', to_jsonb(o), 'gift_card', to_jsonb(g), 'payment', to_jsonb(pay), 'already_paid', false);
end;
$$;
revoke execute on function public.confirm_order_payment(uuid, text, text, integer, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.confirm_order_payment(uuid, text, text, integer, jsonb, timestamptz) to service_role;

-- the buyers' photos: private, the server signs short-lived links
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-photos', 'gift-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
