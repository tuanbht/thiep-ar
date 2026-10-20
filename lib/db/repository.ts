/* Where the platform keeps its data. Business code depends on this interface only; Supabase implements it in
   production (lib/db/supabase-repository.ts), memory in tests (lib/db/memory-repository.ts). Every method throws
   RepositoryError on a storage failure; "not found" is null, never an error. */
import type { AnalyticsEvent, Buyer, GiftCard, GiftContent, Order, Payment, PaymentProviderId, Product, ProductFilter, ShelfCategory } from '../domain/types';

export class RepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); }
}

/** A unique value (a gift's slug, an order's code) is taken: a fresh random one may succeed. */
export class UniqueViolation extends RepositoryError {}

/** The order is not in a state the change allows (e.g. paying an order that is cancelled, or for another amount). */
export class StateError extends Error {}

export interface NewGiftCard {
  slug: string;
  productId: string;
  template: string;
  design: string | null;
  content: GiftContent;
}

export interface NewOrder {
  code: string;
  giftCardId: string;
  productId: string;
  amountVnd: number;
  buyer: Buyer;
  accessTokenHash: string;
}

export interface PaymentConfirmation {
  orderId: string;
  provider: PaymentProviderId;
  providerRef: string;
  amountVnd: number;
  raw: unknown;
  paidAt: string;
}

export interface ConfirmedPayment {
  order: Order;
  giftCard: GiftCard;
  payment: Payment;
  /** the order was already paid by this very payment: nothing changed (a provider retrying its callback) */
  alreadyPaid: boolean;
}

export interface Repository {
  /** the active products, in shop order; with words, those matching every word, best match first; with a category,
      only its products */
  listProducts(filter?: ProductFilter): Promise<Product[]>;
  /** the categories that have products on sale, in shop order, with how many */
  listCategories(): Promise<ShelfCategory[]>;
  getProduct(id: string): Promise<Product | null>;

  /** a draft gift card (status "draft") with its unique slug; RepositoryError if the slug is taken */
  createGiftCard(input: NewGiftCard): Promise<GiftCard>;
  getGiftCard(id: string): Promise<GiftCard | null>;
  getGiftCardBySlug(slug: string): Promise<GiftCard | null>;

  /** a pending order for a draft gift card */
  createOrder(input: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  /** an order by its code ("GC-261016-7K3QX"), e.g. from a bank transfer's message */
  getOrderByCode(code: string): Promise<Order | null>;
  /** remember which provider and reference a payment was started with (the order stays pending) */
  setOrderPayment(orderId: string, provider: PaymentProviderId, ref: string): Promise<Order>;

  /** atomically: the order becomes paid, its gift card active, and the payment is recorded. Idempotent for the same
      provider reference; StateError if the order is not pending (or paid by another payment) or the amount differs. */
  confirmPayment(input: PaymentConfirmation): Promise<ConfirmedPayment>;

  recordEvent(event: AnalyticsEvent): Promise<void>;
}
