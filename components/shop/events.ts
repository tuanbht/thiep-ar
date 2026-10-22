/* Counting what visitors do, in Google Analytics (lib/analytics/ga.ts). Best effort by design: a lost event must
   never get in the way of writing, paying or opening a card, so nothing here throws. */
import {
  gaId,
  track as send,
  type GaEventName,
  type GaParams,
} from "@/lib/analytics/ga";

export interface ShopEvent {
  name: GaEventName;
  productId?: string;
  props?: GaParams;
}

export function track({ name, productId, props }: ShopEvent): void {
  send(name, productId ? { ...props, product_id: productId } : { ...props });
}

/** once in this browser for this key: an order's payment, seen again on a reload, is still one payment. Without
    Google Analytics nothing is sent, so nothing is marked as sent either. */
export function trackOnce(key: string, event: ShopEvent): void {
  if (!gaId()) return;
  const k = `gc_counted:${key}`;
  try {
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
  } catch {
    /* no storage: count it anyway */
  }
  track(event);
}
