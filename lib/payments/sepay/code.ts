/* An order's payment code: the message the buyer's bank transfer carries, which is how SePay's money finds its order.
   Banks keep letters and digits but often drop dashes and spaces, and may add words of their own around it, so the
   code is the order code without its dashes ("GC-261020-7K3QX" -> "GC2610207K3QX") and is looked for anywhere in the
   message, letters and digits only. */
import { READABLE } from "../../orders/ids";

const squash = (text: string): string =>
  text.toUpperCase().replace(/[^0-9A-Z]/g, "");

export const paymentCode = (orderCode: string): string => squash(orderCode);

const FOUND = new RegExp(`GC(\\d{6})([${READABLE}]{5})`);

/** The order code a transfer's message names, or null ("ck GC2610207K3QX thanks" -> "GC-261020-7K3QX"). */
export function orderCodeIn(text: string): string | null {
  const m = squash(text).match(FOUND);
  return m ? `GC-${m[1]}-${m[2]}` : null;
}

/** Whether a transfer's message carries this payment code. */
export const carriesCode = (text: string, code: string): boolean =>
  squash(text).includes(squash(code));
