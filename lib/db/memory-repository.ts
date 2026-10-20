/* The Repository in memory, for the unit tests. Same rules as Supabase's
   (unique slugs and codes, confirmPayment atomic and idempotent); every value handed out is a copy. */
import { randomUUID } from 'node:crypto';
import type { AnalyticsEvent, Category, GiftCard, Order, Payment, Product, ProductFilter, ShelfCategory } from '../domain/types';
import { queryWords, score } from './memory-search';
import { RepositoryError, StateError, UniqueViolation, type ConfirmedPayment, type NewGiftCard, type NewOrder, type PaymentConfirmation, type Repository } from './repository';

const copy = <T>(v: T): T => structuredClone(v);

export class MemoryRepository implements Repository {
  private readonly products = new Map<string, Product>();
  private readonly categories = new Map<string, Category>();
  private readonly gifts = new Map<string, GiftCard>();
  private readonly orders = new Map<string, Order>();
  private readonly payments: Payment[] = [];
  readonly events: AnalyticsEvent[] = [];

  constructor(products: Product[] = [], private readonly now: () => Date = () => new Date(), categories: Category[] = []) {
    for (const p of products) this.products.set(p.id, copy(p));
    for (const c of categories) this.categories.set(c.id, copy(c));
  }

  async listProducts({ query, category }: ProductFilter = {}): Promise<Product[]> {
    const words = queryWords(query);
    return [...this.products.values()]
      .filter(p => p.active && (!category || p.categories.includes(category)))
      .map(p => ({ p, rank: words.length ? score(p, query ?? '', words, this.categories) : 1 }))
      .filter(r => r.rank > 0)
      .sort((a, b) => b.rank - a.rank || a.p.sort - b.p.sort || a.p.id.localeCompare(b.p.id))
      .map(r => copy(r.p));
  }

  async listCategories(): Promise<ShelfCategory[]> {
    const onSale = [...this.products.values()].filter(p => p.active);
    return [...this.categories.values()]
      .map(c => ({ ...copy(c), count: onSale.filter(p => p.categories.includes(c.id)).length }))
      .filter(c => c.count > 0)
      .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
  }

  async getProduct(id: string): Promise<Product | null> {
    const p = this.products.get(id);
    return p ? copy(p) : null;
  }

  async createGiftCard(input: NewGiftCard): Promise<GiftCard> {
    if ([...this.gifts.values()].some(g => g.slug === input.slug)) throw new UniqueViolation(`slug ${input.slug} is taken`);
    if (!this.products.has(input.productId)) throw new RepositoryError(`no product ${input.productId}`);
    const g: GiftCard = { id: randomUUID(), ...copy(input), status: 'draft', createdAt: this.now().toISOString(), activatedAt: null };
    this.gifts.set(g.id, g);
    return copy(g);
  }

  async getGiftCard(id: string): Promise<GiftCard | null> {
    const g = this.gifts.get(id);
    return g ? copy(g) : null;
  }

  async getGiftCardBySlug(slug: string): Promise<GiftCard | null> {
    const g = [...this.gifts.values()].find(x => x.slug === slug);
    return g ? copy(g) : null;
  }

  async createOrder(input: NewOrder): Promise<Order> {
    if ([...this.orders.values()].some(o => o.code === input.code)) throw new UniqueViolation(`order code ${input.code} is taken`);
    if (!this.gifts.has(input.giftCardId)) throw new RepositoryError(`no gift card ${input.giftCardId}`);
    const o: Order = { id: randomUUID(), ...copy(input), status: 'pending', paymentProvider: null, paymentRef: null, paidAt: null,
      createdAt: this.now().toISOString() };
    this.orders.set(o.id, o);
    return copy(o);
  }

  async getOrder(id: string): Promise<Order | null> {
    const o = this.orders.get(id);
    return o ? copy(o) : null;
  }

  async getOrderByCode(code: string): Promise<Order | null> {
    const o = [...this.orders.values()].find(x => x.code === code);
    return o ? copy(o) : null;
  }

  async setOrderPayment(orderId: string, provider: Order['paymentProvider'] & string, ref: string): Promise<Order> {
    const o = this.orders.get(orderId);
    if (!o) throw new RepositoryError(`no order ${orderId}`);
    if (o.status !== 'pending') throw new StateError(`order ${o.code} is ${o.status}`);
    const next = { ...o, paymentProvider: provider, paymentRef: ref };
    this.orders.set(orderId, next);
    return copy(next);
  }

  async confirmPayment(c: PaymentConfirmation): Promise<ConfirmedPayment> {
    const o = this.orders.get(c.orderId);
    if (!o) throw new StateError(`no order ${c.orderId}`);
    const g = this.gifts.get(o.giftCardId);
    if (!g) throw new RepositoryError(`order ${o.code} has no gift card`);
    const same = this.payments.find(p => p.orderId === o.id && p.provider === c.provider && p.providerRef === c.providerRef && p.status === 'succeeded');
    if (o.status === 'paid') {
      if (same) return { order: copy(o), giftCard: copy(g), payment: copy(same), alreadyPaid: true };
      throw new StateError(`order ${o.code} is already paid`);
    }
    if (o.status !== 'pending') throw new StateError(`order ${o.code} is ${o.status}`);
    if (c.amountVnd !== o.amountVnd) throw new StateError(`order ${o.code} costs ${o.amountVnd} VND, not ${c.amountVnd}`);
    if (this.payments.some(p => p.provider === c.provider && p.providerRef === c.providerRef && p.status === 'succeeded'))
      throw new StateError(`payment ${c.provider} ${c.providerRef} already paid another order`);   // one provider payment pays one order
    const payment: Payment = { id: randomUUID(), orderId: o.id, provider: c.provider, providerRef: c.providerRef, amountVnd: c.amountVnd,
      status: 'succeeded', raw: copy(c.raw), createdAt: this.now().toISOString() };
    const order: Order = { ...o, status: 'paid', paidAt: c.paidAt, paymentProvider: c.provider, paymentRef: c.providerRef };
    const giftCard: GiftCard = { ...g, status: 'active', activatedAt: c.paidAt };
    this.payments.push(payment);
    this.orders.set(o.id, order);
    this.gifts.set(g.id, giftCard);
    return { order: copy(order), giftCard: copy(giftCard), payment: copy(payment), alreadyPaid: false };
  }

  async recordEvent(event: AnalyticsEvent): Promise<void> {
    this.events.push(copy(event));
  }
}
