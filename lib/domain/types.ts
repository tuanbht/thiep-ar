/* The platform's domain: what is sold (products), what a buyer writes (gift content), what they buy (orders) and what
   the recipient opens (gift cards). Plain data, shared by the server, the pages and the tests. */

export type Kind = "3d" | "film";

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
  /** words a buyer might search for ("mưa", "cầu hôn") */
  tags: string[];
  /** the ids of the shelf categories it is in, in shelf order */
  categories: string[];
}

/** A shelf category ("Tình yêu", "Sinh nhật"); a product can be in several. */
export interface Category {
  id: string;
  name: string;
  blurb: string | null;
  sort: number;
}

/** A category as the shelf offers it: with how many products on sale are in it. */
export interface ShelfCategory extends Category {
  count: number;
}

/** What the shelf asks for; both optional. */
export interface ProductFilter {
  /** words typed: each must begin a word of the product (its name, tags, categories or blurb), accents optional */
  query?: string;
  /** a category id */
  category?: string;
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
  /** where the buyer's photos are kept (Supabase Storage, bucket gift-photos), in their order, each once */
  photoPaths: string[];
}

export type GiftStatus = "draft" | "active" | "disabled";

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

export type OrderStatus =
  "pending" | "paid" | "failed" | "cancelled" | "refunded";

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
export type PaymentProviderId = "test" | "sepay";

export interface Payment {
  id: string;
  orderId: string;
  provider: PaymentProviderId;
  /** the provider's own id for the payment (SePay: its transaction id) */
  providerRef: string;
  amountVnd: number;
  status: "succeeded" | "failed";
  /** what the provider sent, for disputes and audits */
  raw: unknown;
  createdAt: string;
}
