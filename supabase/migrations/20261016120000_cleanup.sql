-- Abandoned purchases. A buyer who never pays leaves a pending order and a draft gift card (and maybe a photo) behind;
-- cleanup_abandoned removes those older than the cut-off and returns the photo paths of the cards it removed, so the
-- caller (GET /api/cron/cleanup) can delete them from Storage. Orders with any payment record are never touched.

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
    returning g.content ->> 'photoPath' as photo_path
  )
  select coalesce(array_agg(photo_path) filter (where photo_path is not null), '{}'), count(*)::integer
    into v_photos, v_cards
    from gone;

  return jsonb_build_object('orders', v_orders, 'gift_cards', v_cards, 'photos', to_jsonb(v_photos));
end;
$$;

revoke all on function public.cleanup_abandoned(interval) from public, anon, authenticated;
grant execute on function public.cleanup_abandoned(interval) to service_role;
