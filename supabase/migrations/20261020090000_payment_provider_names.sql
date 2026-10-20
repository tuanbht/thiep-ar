-- Which payment providers exist is the app's business (PAYMENT_PROVIDER, lib/payments), not the database's: a provider
-- is stored as its id, and any well-formed id is accepted, so adding or retiring one ("test", "sepay", ...) needs no
-- migration. Orders paid through a retired provider keep its id.
alter table public.orders drop constraint if exists orders_payment_provider_check;
alter table public.orders add constraint orders_payment_provider_check
  check (payment_provider is null or payment_provider ~ '^[a-z][a-z0-9_]{1,31}$');

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check check (provider ~ '^[a-z][a-z0-9_]{1,31}$');
