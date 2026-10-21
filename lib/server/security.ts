/* What every state-changing route checks: that the request comes from this site, that one address does not send too
   many, and the helpers for the buyer's secret token. */
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/* ── same origin ── */

/** A POST from this site's own pages: its Origin (scheme, host and port) is the configured site address; outside
    production (`strict` false) the request's own origin passes too, so a dev server on any port works. Browsers send
    Origin on every POST; a request without one passes only when the browser says it is same-origin (Sec-Fetch-Site). */
export function isSameOrigin(
  req: Request,
  siteUrl?: string,
  strict = false,
): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null")
    return req.headers.get("sec-fetch-site") === "same-origin";
  let from: string;
  try {
    from = new URL(origin).origin;
  } catch {
    return false;
  }
  const allowed = new Set<string>();
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).origin);
    } catch {
      /* checked in env.ts */
    }
  }
  if (!strict || !siteUrl) {
    try {
      const own = new URL(req.url);
      allowed.add(own.origin);
      const host = req.headers.get("host");
      if (host) allowed.add(`${own.protocol}//${host}`);
    } catch {
      /* a relative URL has no origin */
    }
  }
  return allowed.has(from);
}

/* ── rate limits ── */

/** The caller's address, as the host's proxy saw it. `trustedHeader` (TRUSTED_IP_HEADER, e.g. x-vercel-forwarded-for)
    is a header only the platform sets; without it, the LAST hop of X-Forwarded-For, the one the nearest proxy added
    (the first hops are whatever the client sent, so a limit keyed on them is easy to dodge). */
export function clientIp(req: Request, trustedHeader?: string): string {
  if (trustedHeader) {
    const v = req.headers.get(trustedHeader)?.split(",")[0]?.trim();
    if (v) return v;
  }
  const hops = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    hops[hops.length - 1] || req.headers.get("x-real-ip")?.trim() || "unknown"
  );
}

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

/** A sliding window per key, kept in this process's memory. Good for one server (the MVP); with several instances
    or serverless, use a shared store (Redis / Upstash) so the limit holds across them. */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  check(key: string, now = Date.now()): RateResult {
    const since = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return {
        ok: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((recent[0] + this.windowMs - now) / 1000),
        ),
      };
    }
    this.hits.delete(key); // re-inserted last: the oldest keys are the first to go
    this.hits.set(key, [...recent, now]);
    if (this.hits.size > this.maxKeys) {
      const oldest = this.hits.keys().next().value;
      if (oldest !== undefined) this.hits.delete(oldest);
    }
    return { ok: true, retryAfterSec: 0 };
  }
}

/* ── tokens ── */

/** A random secret, base64url (32 bytes = 256 bits by default). */
export const randomToken = (bytes = 32): string =>
  randomBytes(bytes).toString("base64url");

export const sha256Hex = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex");

/** Two hex digests compared in constant time (false for different lengths or non-hex input). */
export function safeEqualHex(a: string, b: string): boolean {
  if (
    a.length !== b.length ||
    !/^[0-9a-f]*$/i.test(a) ||
    !/^[0-9a-f]*$/i.test(b)
  )
    return false;
  const x = Buffer.from(a, "hex"),
    y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}
