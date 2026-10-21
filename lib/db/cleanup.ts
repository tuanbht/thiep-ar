/* The nightly sweep of abandoned purchases: pending orders and draft gift cards nobody paid for (older than a day), the
   photos those cards held, and photos uploaded while writing a card that was never ordered. A photo goes only when no
   card left shows it. Paid cards and their
   photos are never touched. Called by GET /api/cron/cleanup. */
import 'server-only';
import { getAdminClient, type Db } from './client';
import { PHOTO_BUCKET } from './photos';
import { RepositoryError } from './repository';

export interface CleanupResult {
  orders: number;
  giftCards: number;
  photos: number;
}

const PAGE = 1000;

export async function cleanupAbandoned(olderThanHours = 24, db: Db = getAdminClient(), now = new Date()): Promise<CleanupResult> {
  const { data, error } = await db.rpc('cleanup_abandoned', { p_older_than: `${olderThanHours} hours` });
  if (error) throw new RepositoryError(`clean up abandoned orders: ${error.message}`, error);
  const r = data as { orders: number; gift_cards: number; photos: string[] };
  const cutoff = now.getTime() - olderThanHours * 3600_000;
  const candidates = [...new Set([...r.photos, ...(await oldDrafts(db, cutoff))])];
  const shown = await inUse(db, candidates);                           // a photo goes only when no card is left that shows it:
  const paths = candidates.filter(p => !shown.has(p));                 // a kept draft can share one with a paid card
  for (let i = 0; i < paths.length; i += PAGE) {
    const { error: e } = await db.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + PAGE));
    if (e) throw new RepositoryError(`remove abandoned photos: ${e.message}`, e);
  }
  return { orders: r.orders, giftCards: r.gift_cards, photos: paths.length };
}

/** drafts/ photos uploaded before the cut-off */
async function oldDrafts(db: Db, cutoff: number): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(PHOTO_BUCKET).list('drafts', { limit: PAGE, offset, sortBy: { column: 'created_at', order: 'asc' } });
    if (error) throw new RepositoryError(`list draft photos: ${error.message}`, error);
    for (const o of data ?? []) if (o.created_at && Date.parse(o.created_at) < cutoff) out.push(`drafts/${o.name}`);
    if (!data || data.length < PAGE) return out;
  }
}

/** which of these photos a gift card (draft or paid) still shows, in its list or (kept before lists) as its one photo */
async function inUse(db: Db, paths: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < paths.length; i += PAGE) {
    const { data, error } = await db.rpc('photos_in_use', { p_paths: paths.slice(i, i + PAGE) });
    if (error) throw new RepositoryError(`look for the cards that show photos: ${error.message}`, error);
    for (const path of data ?? []) out.add(path);
  }
  return out;
}
