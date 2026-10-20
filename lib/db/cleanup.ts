/* The nightly sweep of abandoned purchases: pending orders and draft gift cards nobody paid for (older than a day), the
   photos those cards held, and photos uploaded while writing a card that was never ordered. Paid cards and their
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
  const stale = new Set<string>();                                     // a photo goes only when no card is left that shows it:
  for (const path of [...r.photos, ...(await oldDrafts(db, cutoff))]) {   // a kept draft can share one with a paid card
    if (!stale.has(path) && !(await isReferenced(db, path))) stale.add(path);
  }
  const paths = [...stale];
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

/** whether any gift card (draft or paid) still shows this photo */
async function isReferenced(db: Db, path: string): Promise<boolean> {
  const { count, error } = await db.from('gift_cards').select('id', { count: 'exact', head: true }).eq('content->>photoPath', path);
  if (error) throw new RepositoryError(`look for a photo's card: ${error.message}`, error);
  return (count ?? 0) > 0;
}
