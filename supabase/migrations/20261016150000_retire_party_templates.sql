-- The party-monkey and party-robot templates are gone from the shop. Their products are deleted when nothing points at
-- them, and taken off the shelf (active = false) when an order or a gift card still does, so those keep working.
update public.products p
   set active = false
 where p.id in ('party-monkey', 'party-robot')
   and (exists (select 1 from public.orders o where o.product_id = p.id)
        or exists (select 1 from public.gift_cards g where g.product_id = p.id));

delete from public.products p
 where p.id in ('party-monkey', 'party-robot')
   and not exists (select 1 from public.orders o where o.product_id = p.id)
   and not exists (select 1 from public.gift_cards g where g.product_id = p.id);
