/* The names an order and its gift go by.
   - slug: the gift's link (/g/<slug>), 10 base62 characters from a cryptographic source (about 59.5 bits): nobody can
     guess a gift that was not sent to them.
   - order code: GC-yymmdd-XXXXX, the day in Vietnam time and 5 characters
     a person can read out over the phone (no 0/O, 1/I/L). */
import { randomBytes as nodeRandomBytes } from "node:crypto";

export type RandomBytes = (n: number) => Uint8Array;

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const READABLE = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const SLUG_LENGTH = 10;
export const SLUG_RE = /^[0-9A-Za-z]{10}$/;
export const ORDER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `n` characters from `alphabet`, each equally likely (bytes that would bias the choice are drawn again). */
export function randomString(
  n: number,
  alphabet: string,
  random: RandomBytes = nodeRandomBytes,
): string {
  const fair = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < n) {
    for (const b of random(n * 2)) {
      if (b < fair) out += alphabet[b % alphabet.length];
      if (out.length === n) break;
    }
  }
  return out;
}

export const makeSlug = (random?: RandomBytes): string =>
  randomString(SLUG_LENGTH, BASE62, random);

/** yymmdd in Vietnam time (UTC+7, no daylight saving). */
export function vnDate(now: Date): string {
  const d = new Date(now.getTime() + 7 * 3600 * 1000);
  const two = (v: number) => String(v).padStart(2, "0");
  return `${two(d.getUTCFullYear() % 100)}${two(d.getUTCMonth() + 1)}${two(d.getUTCDate())}`;
}

export const makeOrderCode = (now: Date, random?: RandomBytes): string =>
  `GC-${vnDate(now)}-${randomString(5, READABLE, random)}`;
