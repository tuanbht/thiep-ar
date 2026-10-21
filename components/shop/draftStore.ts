/* Where a card's draft is kept: localStorage, one per product. draft.ts reads and writes what is in it; this file only
   finds it and lets it go, without zod, so the order page that lets a paid draft go stays light. A draft made into an
   order remembers the order's id until it is written again, so paying exactly that order is what lets it go: reopening
   an old paid order never wipes a newer draft of the same card. Storage that is full or switched off (a private
   window) only means no draft: nothing here throws. */

export const DRAFT_PREFIX = 'gc:draft:';
export const draftKey = (productId: string): string => `${DRAFT_PREFIX}${productId}`;

export function draftStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}

function read(productId: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(draftStorage()?.getItem(draftKey(productId)) ?? 'null');
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
  } catch { return null; }
}

export function hasDraft(productId: string): boolean {
  try { return !!draftStorage()?.getItem(draftKey(productId)); } catch { return false; }
}

export function clearDraft(productId: string): void {
  try { draftStorage()?.removeItem(draftKey(productId)); } catch { /* storage switched off: there is nothing to clear */ }
}

/** The draft became this order (it is exactly what was ordered). */
export function markDraftOrdered(productId: string, orderId: string): void {
  const d = read(productId);
  if (!d) return;
  try { draftStorage()?.setItem(draftKey(productId), JSON.stringify({ ...d, orderId })); } catch { /* full or switched off */ }
}

/** This order is paid: the draft it was made from has done its job. Any other draft stays. */
export function releaseDraft(productId: string, orderId: string): void {
  if (read(productId)?.orderId === orderId) clearDraft(productId);
}
