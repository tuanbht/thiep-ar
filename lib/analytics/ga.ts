/* Google Analytics 4 counts what visitors do: gtag.js, loaded by components/analytics/GoogleAnalytics.tsx. Its
   measurement id is public, NEXT_PUBLIC_GA_ID (G-…); without it nothing loads and nothing is sent. Best effort by
   design: a lost event must never get in the way of writing, paying or opening a card.

   Private links never reach Google. A gift's slug and an order's id are the keys to them, so every address GA sees
   has them replaced (/g/[slug], /orders/[orderId], /checkout/[orderId]), a private page's title too (a gift's title is
   the buyer's own words), and the query is cut down to the shelf's search (q, c) and campaign tags (utm_*, gclid).
   Another site's address keeps only its origin. Page views are ours, not gtag's: it would send whole addresses. */

type Value = string | number | boolean | null | undefined;
export type GaParams = Record<string, Value>;

/** What the shop counts. The order and payment steps are what the buyer's browser saw; the orders and payments
    tables stay the record of what was sold. */
export type GaEventName =
  | "product_view"
  | "preview_open"
  | "customize_start"
  | "photo_uploaded"
  | "checkout_start"
  | "order_created"
  | "payment_started"
  | "order_paid"
  | "gift_open"
  | "ar_start"
  | "card_found"
  | "chapter_reached"
  | "letter_open"
  | "preview_mode";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** the measurement id, when it is one (it goes into a script's address) */
export function gaId(): string {
  const id = process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "";
  return /^G-[A-Z0-9]{4,20}$/.test(id) ? id : "";
}

const PRIVATE: readonly [RegExp, string, string][] = [
  [/^\/g\/[^/]+/, "/g/[slug]", "Gift"],
  [/^\/orders\/[^/]+/, "/orders/[orderId]", "Order"],
  [/^\/checkout\/[^/]+/, "/checkout/[orderId]", "Checkout"],
];
const KEEP = /^(q|c|utm_[a-z_]+|gclid)$/;
const privateOf = (path: string) => PRIVATE.find(([re]) => re.test(path));

/** a page whose address is a key (a gift, an order): GA sees it as a placeholder, under a fixed title */
export const isPrivatePath = (path: string): boolean => !!privateOf(path);

export function redactPath(path: string): string {
  const p = privateOf(path);
  return p ? path.replace(p[0], p[1]) : path;
}

/** an address as GA may see it: on this site, its private parts replaced and its query cut down; elsewhere, its
    origin; nothing at all for one that does not parse */
export function redactUrl(raw: string, here: string): string {
  let u: URL;
  try {
    u = new URL(raw, here);
  } catch {
    return "";
  }
  if (u.origin !== new URL(here).origin) return u.origin;
  if (privateOf(u.pathname)) return `${u.origin}${redactPath(u.pathname)}`;
  const kept = new URLSearchParams();
  for (const [k, v] of u.searchParams) if (KEEP.test(k)) kept.append(k, v);
  const q = kept.toString();
  return `${u.origin}${u.pathname}${q ? `?${q}` : ""}`;
}

/* gtag's queue: calls wait in dataLayer until gtag.js has loaded and reads them. It reads arguments objects, not
   arrays, so this is Google's own snippet. */
function gtag(...args: unknown[]): void {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag ??= function () {
    // eslint-disable-next-line prefer-rest-params -- gtag.js reads the arguments object itself
    window.dataLayer!.push(arguments);
  };
  window.gtag(...args);
}

let ready = false,
  lastHref: string | undefined,
  lastLocation: string | undefined;

/** where the visitor is, as GA may see it */
function here(href = window.location.href, title = document.title): GaParams {
  const p = privateOf(new URL(href).pathname);
  return {
    page_location: redactUrl(href, href),
    page_title: p ? p[2] : title,
  };
}

function setUp(id: string): void {
  if (ready) return;
  ready = true;
  const referrer = document.referrer
    ? redactUrl(document.referrer, window.location.href) || undefined
    : undefined;
  gtag("js", new Date());
  gtag("set", { ...here(), page_referrer: referrer });
  gtag("config", id, { send_page_view: false });
}

/** one page view for each address the visitor reaches: the address it was reached at, and its title once known */
export function pageView(
  href = typeof window === "undefined" ? "" : window.location.href,
  title = typeof document === "undefined" ? "" : document.title,
): void {
  const id = gaId();
  if (!id || typeof window === "undefined") return;
  try {
    setUp(id);
    if (href === lastHref) return; // the same address again (a re-render): one view
    const page = here(href, title);
    const referrer =
      lastLocation ??
      (document.referrer
        ? redactUrl(document.referrer, href) || undefined
        : undefined);
    gtag("set", { ...page, page_referrer: referrer }); // the events that follow are on this page
    gtag("event", "page_view", { ...page, page_referrer: referrer });
    lastHref = href;
    lastLocation = String(page.page_location);
  } catch {
    /* blocked or broken: nothing is counted, nothing else is in the way */
  }
}

/** an event, on the page it happens on */
export function track(name: GaEventName, params: GaParams = {}): void {
  const id = gaId();
  if (!id || typeof window === "undefined") return;
  try {
    setUp(id);
    gtag("event", name, { ...params, ...here() });
  } catch {
    /* blocked or broken: nothing is counted, nothing else is in the way */
  }
}
