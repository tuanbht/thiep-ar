# Bưu cục Đêm: AR gift cards

A shop for printed cards that come to life on a phone. The buyer picks a card, writes its words and the letter at the
end, watches a live preview, pays, and gets a link (and a QR code) for the recipient. The recipient points the phone at
the printed card: a 3D act stands up in front of it and faces them, or a film plays on it, then the letter opens.

Next.js 16 (App Router, cache components) · TypeScript · Tailwind 4 · three.js + MindAR · Supabase (Postgres, Storage)
· Vitest · Playwright · pnpm.

## Run it

```bash
pnpm install
pnpm db:start            # local Supabase in Docker (ports 544xx); prints its URL and keys
cp .env.example .env.local   # then fill SUPABASE_URL and SUPABASE_SECRET_KEY from `pnpm db:start`
pnpm db:reset            # applies supabase/migrations and supabase/seed.sql (the products)
pnpm dev                 # http://localhost:3000
```

With `PAYMENT_PROVIDER=test` (the default) the checkout pays at once, so the whole flow works without a gateway.

## The buy flow

| page | what happens |
|---|---|
| `/` | the shelf: every active product, 3D acts first, then films |
| `/cards/[productId]` | the form from the template's `form.json` beside a live preview; photo upload; "Mua thiệp" creates the order |
| `/checkout/[orderId]` | the order slip and "Thanh toán" |
| `/orders/[orderId]` | waits for the payment, then shows the gift link, its QR code, copy and share |
| `/g/[slug]` | the gift: camera (MindAR tracks the printed card) or without the camera; the letter at the end |

The order belongs to the browser that placed it (an httpOnly cookie holds a random token; only its hash is stored).
A gift opens only once its order is paid. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the routes, the data
and who owns which code.

## Data (Supabase)

`supabase/migrations/` creates `products`, `gift_cards`, `orders`, `payments` and `events` (analytics), the private
`gift-photos` bucket, and `confirm_order_payment`, the one function that marks an order paid, activates its gift card
and records the payment in one transaction (and safely ignores a repeated callback). Row level security is on with no
policies: only the server, with the secret key, reads or writes. Prices are in `products.price_vnd` (49 000 ₫ each to
start); `pnpm db:seed` regenerates `supabase/seed.sql` from the templates.

Events (`events` table) count the funnel and the gift's use. Browsers may report `product_view`, `customize_start`,
`preview_open`, `checkout_start`, `ar_start`, `card_found`, `chapter_reached`, `letter_open` and `preview_mode`; only the
server records `photo_uploaded`, `order_created`, `payment_started`, `order_paid` and `gift_open`, so nobody can post a
fake sale. Referrers are kept as their origin only (a path may be a private gift or order link).

Abandoned purchases are swept nightly: `GET /api/cron/cleanup` (with `Authorization: Bearer $CRON_SECRET`; `vercel.json`
schedules it at 03:00 Vietnam time) deletes pending orders and draft cards older than a day, their photos, and photos
uploaded for cards that were never ordered. Paid cards are never touched.

## Payments

`lib/payments/provider.ts` is the slot (a new provider is code only: the database takes any provider id);
`PAYMENT_PROVIDER` picks `test` (pays at once; refused in production unless
`ALLOW_TEST_PAYMENTS=true`) or `sepay`.

**SePay** (bank transfer by VietQR, `lib/payments/sepay/`):
1. The checkout shows a VietQR code for the shop's bank account (read from SePay's API), with the amount and the
   order's payment code as the transfer message (`GC-261020-7K3QX` -> `GC2610207K3QX`).
2. The page polls `GET /api/orders/:id` every 3 s. The server asks SePay's transaction list (at most every 4 s per order)
   for money into that account carrying the code, of at least the amount; when found, `confirmPayment` marks the order
   paid (idempotent per SePay transaction) and the page moves on to the gift link.
3. SePay's webhook (`POST /callbacks/sepay/ipn`; set it in SePay > Webhooks) makes that check at once. It is only a
   nudge: the money is always read back from SePay's API, never taken from the webhook's body.

Settings: `SEPAY_API_KEY` (my.sepay.vn > Cấu hình công ty > API Access; production and sandbox tokens differ, see
`SEPAY_API_URL`), `SEPAY_BANK_ACCOUNT_ID` (only when several accounts are linked), and the webhook's HMAC secret
`SEPAY_WEBHOOK_SECRET` (else `SEPAY_SECRET_KEY` is read) or API key `SEPAY_WEBHOOK_API_KEY`. Works with any account
linked to SePay, personal ones included. (SePay's per-order VA API, "Tạo đơn hàng", needs a business account at BIDV,
Vietcombank, VietinBank, Shinhan or Sacombank; this shop's account is a personal TPBank one.)
`SEPAY_LIVE=1 pnpm exec vitest run lib/payments/sepay/__tests__/live.test.ts` checks the token and account read-only.

## Assets

- `public/templates/<id>/`: everything a card plays (scene.js, character.js, model.glb, film.mp4/webm, slots.json,
  fonts, targets.mind for tracking, template.json, form.json). Served as they are.
- `public/thumbs/<id>.jpg`: the shop's pictures of each printed design (960 px). The full-size print files are in git
  history (commit 52160e0 and earlier, under `prints/`) for printing the physical cards.

## Tests

```bash
pnpm test                # Vitest: unit tests, plus the database suite against local Supabase when .env.local is set
pnpm test:e2e            # Playwright: the whole buy flow, a fake camera filming the flower-letter print, the database checked
pnpm typecheck && pnpm lint
```

Tests live in a `__tests__` folder beside the code they test.

## Security

- Every request body is parsed with zod; state-changing routes must come from the site's own origin (in production,
  exactly `NEXT_PUBLIC_SITE_URL`) and are rate-limited per address (`TRUSTED_IP_HEADER` names the host's own header).
- Orders: a 256-bit token in an httpOnly cookie, only its sha256 stored, compared in constant time.
- Gifts: unguessable slugs (10 base62 characters), shown only once paid; photos in a private bucket behind 1-hour signed
  links, re-encoded on upload (no location or camera metadata, at most 2400 px).
- Headers: no framing, nosniff, HSTS, strict referrer, camera and motion sensors for this site only. A script CSP with
  nonces is still to do (it has to be tried against MindAR's workers first).
- `confirm_order_payment` checks the amount, locks the order and is idempotent; a payment redirect may only go to the
  provider's own https hosts.

## Deploy

Any Next.js host (Vercel works as is) plus a Supabase project: `supabase link`, `supabase db push`, run
`supabase/seed.sql`, and set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL` (required in production),
`CRON_SECRET` and, on Vercel, `TRUSTED_IP_HEADER=x-vercel-forwarded-for`. The camera needs HTTPS. Keep
`ALLOW_TEST_PAYMENTS` off on a real shop.

## Known limits (MVP)

- Underpaid transfers are not matched (the order waits for the full amount); no refunds from the shop.
- No buyer accounts, emails or receipts; no admin screen (prices and products are edited in Supabase).
- The rate limiter is in memory (one server instance); use Redis or Upstash with several instances.
- The buyer's access lives in a cookie on the browser that ordered; there is no email or account to recover it yet.
- Several templates still have English names, blurbs and starting words (from their `form.json`).
- `pnpm audit` reports one moderate advisory in `sprintf-js` (under tfjs's command-line tools, never loaded in the
  browser; no fixed version exists). mind-ar's `canvas` is removed from the install (`pnpm-workspace.yaml`).

## The old kit

The authoring tools (the Vite Studio, print and tracking compilers, the 3D bake, render scenes, the A-Frame player)
were removed when this became a shop. They are in git: tag `kit-snapshot` (`git show kit-snapshot:<path>`).
