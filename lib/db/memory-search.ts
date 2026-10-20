/* The shelf's search for the in-memory Repository (the unit tests), after Supabase's search_products(). Which products
   match is the same: text is folded (lowercase, no diacritics) and split into words on anything but letters and
   digits; each word typed (the first 8, of the first 100 characters) must begin a word of the product. The order is
   close, not equal: here a word scores the weight of the best field it is found in (name 1, tags and categories .4,
   blurb .2, Postgres' defaults for A, B and C) and the words exactly as typed, accents and all, add 1, while ts_rank
   also counts how often and how close together the words occur. The contract (repository.contract.ts) checks only
   orders both agree on. Letters beyond Vietnamese that unaccent folds (ß, æ, ø) are not folded here. */
import type { Category, Product } from '../domain/types';

const MAX_CHARS = 100, MAX_WORDS = 8;
const WEIGHT = { name: 1, tags: .4, categories: .4, blurb: .2 } as const;

/** "Đèn trời 20/10" -> ["den", "troi", "20", "10"] */
export function searchWords(text: string): string[] {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** what was typed, as search words; none when nothing searchable was typed */
export function queryWords(query: string | undefined): string[] {
  return searchWords((query ?? '').slice(0, MAX_CHARS)).slice(0, MAX_WORDS);
}

/** How well a product matches what was typed (as words): 0 when one of the words begins none of its words. */
export function score(p: Product, typed: string, words: string[], categories: ReadonlyMap<string, Category>): number {
  const fields = [
    [WEIGHT.name, searchWords(p.name)],
    [WEIGHT.tags, searchWords(p.tags.join(' '))],
    [WEIGHT.categories, searchWords(p.categories.map(id => categories.get(id)?.name ?? '').join(' '))],
    [WEIGHT.blurb, searchWords(p.blurb ?? '')]
  ] as const;
  let total = 0;
  for (const w of words) {
    const best = Math.max(0, ...fields.filter(([, ws]) => ws.some(x => x.startsWith(w))).map(([weight]) => weight));
    if (!best) return 0;
    total += best;
  }
  const exact = typed.slice(0, MAX_CHARS).trim().toLowerCase();
  const text = [p.name, p.tags.join(' '), p.blurb ?? ''].join(' ').toLowerCase();
  return total + (exact.length > 1 && text.includes(exact) ? 1 : 0);
}
