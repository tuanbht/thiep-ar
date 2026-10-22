# Gift cards platform: architecture (MVP)

A buyer picks a card, writes its words, previews it, pays, and gets a link (`/g/<slug>`) that brings the printed
card to life on the recipient's phone. Next.js 16 (App Router, cache components), TypeScript, Tailwind 4, three.js,
MindAR, Supabase (Postgres + Storage). Payments go through a provider slot: `test` or SePay (VietQR bank transfer).

## The buy workflow

```
/                      shop: the cards for sale (products), searched by ?q=words and ?c=category
                         (search_products(): Postgres full-text, accents optional)  event product_view
/cards/[productId]     write the card: form (from the template's form.json) beside a live 3D/film preview
                       photo -> POST /api/uploads (Storage, private bucket, drafts/<uuid>.<ext>)
                       "Buy" -> POST /api/orders {productId, content, buyer}
                         creates gift_cards (draft, unique slug) + orders (pending, code GC-yymmdd-XXXXX),
                         sets the buyer's access cookie gc_o_<orderId> (random token; only its sha256 is stored)
/checkout/[orderId]    summary + "Pay" -> POST /api/orders/:id/pay -> provider.start()
                         test:    confirmPayment at once -> redirect /orders/:id
                         sepay:   a VietQR code (amount + the order's code as the message); the page polls
                                  GET /api/orders/:id, which asks SePay's transactions for the money and then
                                  confirmPayment; SePay's webhook (POST /callbacks/sepay/ipn) triggers that check
/orders/[orderId]      status; once paid: the gift link /g/<slug>, a QR code, copy/share
/g/[slug]              the gift (active only): AR player (camera; the act faces the phone) or without the camera;
                       the photo comes as a short-lived signed URL
```

Every night `GET /api/cron/cleanup` (CRON_SECRET) runs `cleanup_abandoned`: pending orders and draft cards older than a
day go, with their photos and any upload no card uses.

`confirmPayment` (one Postgres function, `confirm_order_payment`) is the only way an order becomes paid: it checks the
amount, marks the order paid, activates the gift card and records the payment, all at once, and is idempotent for the
same provider reference (a provider may call back more than once).

## Data (supabase/migrations)

| table              | what                                                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| products           | what is sold: template (+ design), name, kind, price in VND, active, sort, tags (search words), search (tsvector, kept by triggers) |
| categories         | the shelf's categories (id, name, blurb, sort), from supabase/categories.json                                                       |
| product_categories | which product is in which category (a product can be in several)                                                                    |
| gift_cards         | the buyer's content (jsonb), slug (unique, unguessable), status draft/active/disabled                                               |
| orders             | code, amount, status, buyer contact, access token hash, payment provider + ref, paid_at                                             |
| payments           | every confirmed payment, with the provider's raw payload                                                                            |

The database does not list the payment providers: `orders.payment_provider` and `payments.provider` take any lowercase
id (`^[a-z][a-z0-9_]{1,31}$`). Which ones exist is the app's business (`PaymentProviderId`, `PAYMENT_PROVIDER`), so
adding or retiring a provider needs no migration; orders paid through a retired one keep its id.

RLS is on for every table with no policies: only the server (secret key) reads and writes. Storage bucket
`gift-photos` is private; the server signs short-lived URLs.

## Code map

| path                                                                                                                                                      | what                                                                                                         | owner    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| `lib/domain/types.ts`                                                                                                                                     | the domain types                                                                                             | contract |
| `lib/db/repository.ts`                                                                                                                                    | the Repository interface                                                                                     | contract |
| `lib/db/supabase-repository.ts`, `lib/db/memory-repository.ts`, `supabase/`                                                                               | data                                                                                                         | data     |
| `lib/payments/provider.ts`                                                                                                                                | PaymentProvider interface                                                                                    | contract |
| `lib/payments/test-provider.ts`, `lib/orders/`, `lib/server/`, `lib/catalog/templates.ts`, `lib/content/validate.ts`, `app/api/**` (incl. `cron/cleanup`) | server                                                                                                       | server   |
| `lib/api/dto.ts`, `lib/catalog/form.ts`, `lib/content/toCard.ts`                                                                                          | shared shapes and pure helpers                                                                               | contract |
| `lib/player/**`, `components/player/**`                                                                                                                   | the AR player (three.js + MindAR, no A-Frame)                                                                | player   |
| `app/**` (not `app/api`), `components/shop/**`, `app/globals.css`                                                                                         | the shop's pages and design                                                                                  | shop     |
| `public/templates/<id>/`                                                                                                                                  | template assets, served as they are                                                                          | assets   |
| `public/templates/_acts/lovestory.js`, `public/templates/<love card>/story.js`                                                                            | the love story cards' shared act and each card's story                                                       | assets   |
| `scripts/pack-models.mjs`, `scripts/models/`, `scripts/print-card.mjs`, `print-designs/`, `scripts/shoot-card.mjs`                                        | making a 3D card: free models trimmed to what it uses, its print and tracking target, pictures of every stop | tools    |

## Conventions

- Server-only modules start with `import 'server-only'`; the secret key never reaches the browser.
- Every request body is parsed with its zod schema (`lib/api/dto.ts`); errors are `{ error }` with a status.
- State-changing routes check the Origin header (same origin) and are rate-limited per IP.
- Next 16 differs from older versions: read `node_modules/next/dist/docs/` before using an API (params are Promises,
  `cookies()` is async, cache components need `<Suspense>` around request-time data).
- Tests live in a `__tests__` folder beside the code they test. Vitest (`pnpm test`); the database tests run against local
  Supabase when `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set (.env.local);
  Playwright for the buy flow (`pnpm test:e2e`).
