/* The platform's domain: what is sold (products), what a buyer writes (gift content), what they buy (orders) and what
   the recipient opens (gift cards). Plain data, shared by the server, the pages and the tests. */

export type Kind = '3d' | 'film';

/** A card for sale: one template (and optionally one printed design of it) at a price. */
export interface Product {
  id: string;
  template: string;
  design: string | null;
  name: string;
  /** one line for the shop shelf */
  blurb: string | null;
  kind: Kind;
  priceVnd: number;
  active: boolean;
  sort: number;
}

/** What the buyer writes: the words the act shows, the letter at the end, an optional photo. */
export interface GiftContent {
  /** the start screen's title, e.g. "Gửi Hanna" */
  title: string;
  /** the start screen's lead line */
  intro: string;
  letter: { to: string; body: string[]; from: string };
  /** the act's words by slot name (a 3D act's board is "board"; a film has many) */
  slots: Record<string, string>;
  /** where the photo is kept (Supabase Storage, bucket gift-photos), or null */
  photoPath: string | null;
}

export type GiftStatus = 'draft' | 'active' | 'disabled';

/** The gift the recipient opens at /g/<slug>; it can be opened once its order is paid (status active). */
export interface GiftCard {
  id: string;
  slug: string;
  productId: string;
  template: string;
  design: string | null;
  content: GiftContent;
  status: GiftStatus;
  createdAt: string;
  activatedAt: string | null;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface Buyer {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface Order {
  id: string;
  /** short and human: "GC-261016-7K3QX"; without its dashes it is the bank transfer's message (SePay) */
  code: string;
  giftCardId: string;
  productId: string;
  amountVnd: number;
  status: OrderStatus;
  buyer: Buyer;
  /** sha256 of the buyer's access token (the token itself lives only in the buyer's cookie) */
  accessTokenHash: string;
  paymentProvider: PaymentProviderId | null;
  paymentRef: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** The providers the app knows. The database stores any lowercase id (a-z, 0-9, _), so adding one needs no migration. */
export type PaymentProviderId = 'test' | 'sepay';

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProviderId;
  /** the provider's own id for the payment (SePay: its transaction id) */
  providerRef: string;
  amountVnd: number;
  status: 'succeeded' | 'failed';
  /** what the provider sent, for disputes and audits */
  raw: unknown;
  createdAt: string;
}

/** What the platform counts, for stats later. */
export const EVENT_NAMES = [
  'product_view', 'customize_start', 'preview_open', 'photo_uploaded', 'checkout_start', 'order_created', 'payment_started',
  'order_paid', 'gift_open', 'ar_start', 'card_found', 'chapter_reached', 'letter_open', 'preview_mode'
] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** What a browser may report (POST /api/events). The rest (order_created, payment_started, order_paid, gift_open,
    photo_uploaded) only the server records, so nobody can post a fake sale into the stats. */
export const CLIENT_EVENT_NAMES = [
  'product_view', 'customize_start', 'preview_open', 'checkout_start', 'ar_start', 'card_found', 'chapter_reached', 'letter_open', 'preview_mode'
] as const satisfies readonly EventName[];

export interface AnalyticsEvent {
  name: EventName;
  sessionId?: string | null;
  giftCardId?: string | null;
  orderId?: string | null;
  productId?: string | null;
  props?: Record<string, string | number | boolean | null>;
  userAgent?: string | null;
  referrer?: string | null;
}
