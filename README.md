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

| page                  | what happens                                                                                                                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | the shelf: every active product, 3D acts first, then films; search it by words (`?q=`) and by category (`?c=`)                                                                                                                          |
| `/cards/[productId]`  | the form from the template's `form.json` beside a live preview; photo upload; "Mua thiệp" creates the order; the card being written is kept as a draft in the browser (localStorage) until its order is paid, so a reload loses nothing |
| `/checkout/[orderId]` | the order slip and "Thanh toán"                                                                                                                                                                                                         |
| `/orders/[orderId]`   | waits for the payment, then shows the gift link, its QR code, copy and share                                                                                                                                                            |
| `/g/[slug]`           | the gift: camera (MindAR tracks the printed card) or without the camera; the letter at the end                                                                                                                                          |

The order belongs to the browser that placed it (an httpOnly cookie holds a random token; only its hash is stored).
A gift opens only once its order is paid. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the routes, the data
and who owns which code.

## Data (Supabase)

`supabase/migrations/` creates `products`, `gift_cards`, `orders` and `payments`, the private
`gift-photos` bucket, and `confirm_order_payment`, the one function that marks an order paid, activates its gift card
and records the payment in one transaction (and safely ignores a repeated callback). Row level security is on with no
policies: only the server, with the secret key, reads or writes. Prices are in `products.price_vnd` (49 000 ₫ each to
start); `pnpm db:seed` regenerates `supabase/seed.sql` from the templates (a template is sold once it has `form.json`,
its print's `targets.mind` and its shop picture `public/thumbs/<id>.jpg`).

Search and categories: the shelf's categories are `supabase/categories.json` (seeded into `categories`, in that order);
each template names its own in `template.json` (`"categories": ["love", "couple"]`) with its search words
(`"tags": ["mưa", "chiếc ô"]`). Adding a category or moving a card is a data change, not a migration. Search is
Postgres full-text (`search_products()`): a card's name, tags, categories and blurb are folded to plain lowercase
(`unaccent`, so "tinh yeu" finds "Tình yêu") into an indexed `products.search` that triggers keep fresh; every word
typed must begin a word of the card, the name counts most, and the words exactly as typed rank first.

Abandoned purchases are swept nightly: `GET /api/cron/cleanup` (with `Authorization: Bearer $CRON_SECRET`; `vercel.json`
schedules it at 03:00 Vietnam time) deletes pending orders and draft cards older than a day, their photos, and photos
uploaded for cards that were never ordered. Paid cards are never touched. Before rolling the app back to a build from
before photo lists (a card's `photoPaths`), switch the cron off: that build reads only `photoPath`, so it would take
the photos of cards kept as lists, paid ones too, for unused.

## Analytics (Google Analytics 4)

What visitors do is counted by Google Analytics, from the browser (`lib/analytics/ga.ts`, loaded by
`components/analytics/GoogleAnalytics.tsx` in the root layout). Set `NEXT_PUBLIC_GA_ID` to the web stream's
measurement ID (`G-…`); without it nothing loads and nothing is sent.

- **Page views** are sent by the app, one per address reached. In GA, turn off Admin > Data streams > the web stream >
  Enhanced measurement > Page views > "Page changes based on browser history events", or every navigation counts twice.
- **Events:** `product_view`, `preview_open`, `customize_start`, `photo_uploaded`, `checkout_start`, `order_created`,
  `payment_started`, `order_paid` (once per order in a browser, with `value` and `currency`), and on the gift
  `gift_open`, `ar_start`, `card_found`, `chapter_reached`, `letter_open`, `preview_mode`. Each carries `product_id`
  where there is one. Mark `order_paid` as a key event to see sales in GA's reports.
- **Private links never reach Google:** a gift's slug and an order's id are cut out of every address GA sees
  (`/g/[slug]`, `/orders/[orderId]`, `/checkout/[orderId]`), with a private page's title; queries keep only the shelf's
  search (`q`, `c`) and campaign tags (`utm_*`, `gclid`); another site's address keeps its origin only.
- GA is a browser's count, best effort and blockable: the `orders` and `payments` tables stay the record of what was
  sold.

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
- `print-designs/<id>.html`: the printed designs of the love story cards (1280 × 800). `scripts/print-card.mjs` draws one
  into the print (`print-designs/out/<id>.png`, 2560 px, not committed), the shop's picture and the card's `targets.mind`.

## Love story cards

Eleven 3D cards are short love stories told by one shared act, `public/templates/_acts/lovestory.js`, and each card's
own `story.js`: about eighteen seconds in three chapters, each ending at a stop that holds the card's words or photo until
a tap. `starry-date`, `bouquet-surprise`, `candlelight-dinner`, `our-little-home` and `robots-in-love`; then
`build-our-house`, `sunset-beach`, `moon-meteors`, and three that borrow the mood of famous animated-film moments (a
rainy bus stop, petals at a railway crossing, a witch's delivery flight) with our own characters and designs only:
`rain-umbrella`, `sakura-crossing`, `broom-delivery`. Painted skies stand at the card's back edge (`kit.backdrop`). The act's header
comment is its API (models and their clips, `hold`, `aim` and `bend` for gestures the clips lack, signs, the polaroid,
particles, glows, lights).

Their characters and props are free models that need no account: KayKit's chibi Adventurers with their own 76
animations, KayKit's furniture and restaurant props, and the RobotExpressive robot, all CC0
(`scripts/models/sources.mjs` pins each pack to a commit; `template.json` notes each pack's author, and the shop shows
no credits).

```bash
node scripts/pack-models.mjs <id>    # scripts/models/recipes/<id>.json -> public/templates/<id>/models/*.glb with only the parts
                                     # and clips the card uses (a character ~450 KB), plus template.json "models" and "credits"
node scripts/print-card.mjs <id>     # print-designs/<id>.html -> the print, public/thumbs/<id>.jpg and targets.mind (with its
                                     # feature count; parallel runs queue on .cache/compile.lock)
node scripts/shoot-card.mjs <id>     # plays the card on the dev player (pnpm dev running) in a headless browser and keeps a
                                     # picture of every stop and a few on the way, in .cache/shots/<id>/
```

## Tests

```bash
pnpm test                # Vitest: unit tests, plus the database suite against local Supabase when .env.local is set
pnpm test:e2e            # Playwright: the whole buy flow, a fake camera filming the flower-letter print, the database checked
pnpm typecheck
pnpm lint                # ESLint, then Prettier --check (Prettier's default style)
pnpm lint:fix            # ESLint --fix, then Prettier --write
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

Search engines find the shop through `/robots.txt` and `/sitemap.xml` (`app/robots.ts`, `app/sitemap.ts`): the shelf,
the about page and every card on sale with its picture, at `NEXT_PUBLIC_SITE_URL`; gift, order and checkout links are
never listed. Submit `https://<site>/sitemap.xml` once in Google Search Console.

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
were removed when this became a shop. They are in git: commit `d595adc` (`git show d595adc:<path>`).
