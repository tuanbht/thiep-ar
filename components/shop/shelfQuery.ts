/* What the shelf is asked for lives in the page's address: /?q=words&c=category. Here it is read (tidied, so nothing
   odd reaches the database) and written back into links. The search box tidies its words the same way, so what it asked
   for and what the address says agree. */

export const QUERY_MAX = 80;
const CATEGORY = /^[a-z0-9][a-z0-9-]{0,39}$/;

export interface ShelfParams {
  /** the words typed, spaces tidied ('' for none) */
  q: string;
  /** a category id, or null */
  c: string | null;
}

type Search = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/** Words as the shelf searches them: control characters (which Postgres refuses: a scanner's ?q=%00) and runs of
    spaces made one space, trimmed, cut to QUERY_MAX; '' when no letter or digit is left to search for. */
export function tidyQuery(text: string): string {
  const q = text.replace(/\p{Cc}+/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, QUERY_MAX).trim();
  return /[\p{L}\p{N}]/u.test(q) ? q : '';
}

export function readShelfParams(search: Search): ShelfParams {
  const c = first(search.c).trim();
  return { q: tidyQuery(first(search.q)), c: CATEGORY.test(c) ? c : null };
}

/** The shelf's address for these words and this category; the plain shelf when both are empty. */
export function shelfHref({ q, c }: { q?: string; c?: string | null }, hash = ''): string {
  const search = new URLSearchParams();
  if (q?.trim()) search.set('q', q.trim());
  if (c) search.set('c', c);
  const s = search.toString();
  return `/${s ? `?${s}` : ''}${hash}`;
}
