/* The Repository on Supabase (Postgres through PostgREST, with the secret key). Rows are snake_case; the domain is
   camelCase; timestamps come back as ISO strings in UTC. confirmPayment is one Postgres function
   (confirm_order_payment), so the order, its gift card and the payment change together or not at all. */
import 'server-only';
import { z } from 'zod';
import type { AnalyticsEvent, GiftCard, GiftContent, Order, Payment, PaymentProviderId, Product } from '../domain/types';
import type { Db } from './client';
import type { Database, Json } from './database.types';
import { RepositoryError, StateError, UniqueViolation, type ConfirmedPayment, type NewGiftCard, type NewOrder, type PaymentConfirmation, type Repository } from './repository';

type Tables = Database['public']['Tables'];
type ProductRow = Tables['products']['Row'];
type GiftRow = Tables['gift_cards']['Row'];
type OrderRow = Tables['orders']['Row'];
type PaymentRow = Tables['payments']['Row'];

interface PgError { code?: string; message: string; details?: string | null; hint?: string | null }
/** a jsonb value for a column or argument; PostgREST sends JSON null as SQL null, which the payment's raw may be */
const jsonb = (v: unknown) => (v ?? null) as NonNullable<Json>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const iso = (t: string | null): string | null => (t ? new Date(t).toISOString() : null);

/** The function's own errors (SQLSTATE GCxxx) are the order's state; anything else is the store failing. */
function fail(what: string, e: PgError): never {
  if (e.code === 'GC404' || e.code === 'GC409' || e.code === 'GC422') throw new StateError(e.message);
  if (e.code === '23505') throw new UniqueViolation(`${what}: already exists (${e.details ?? e.message})`, e);
  if (e.code === '23503') throw new RepositoryError(`${what}: refers to something that does not exist (${e.details ?? e.message})`, e);
  throw new RepositoryError(`${what}: ${e.message}`, e);
}

export const toProduct = (r: ProductRow): Product => ({
  id: r.id, template: r.template, design: r.design, name: r.name, blurb: r.blurb, kind: r.kind === '3d' ? '3d' : 'film',
  priceVnd: r.price_vnd, active: r.active, sort: r.sort
});

/** What a gift card's content column must hold; a row that does not is an error here, not a crash in the player. */
const storedContent = z.object({
  title: z.string(), intro: z.string(),
  letter: z.object({ to: z.string(), body: z.array(z.string()), from: z.string() }),
  slots: z.record(z.string(), z.string()), photoPath: z.string().nullable()   // older rows' "hints" are dropped
});

export function toGiftCard(r: GiftRow): GiftCard {
  const content = storedContent.safeParse(r.content);
  if (!content.success) throw new RepositoryError(`gift card ${r.id} has content the platform cannot read`);
  return { id: r.id, slug: r.slug, productId: r.product_id, template: r.template, design: r.design,
    content: content.data satisfies GiftContent, status: r.status, createdAt: iso(r.created_at)!, activatedAt: iso(r.activated_at) };
}

export const toOrder = (r: OrderRow): Order => ({
  id: r.id, code: r.code, giftCardId: r.gift_card_id, productId: r.product_id, amountVnd: r.amount_vnd, status: r.status,
  buyer: { name: r.buyer_name, email: r.buyer_email, phone: r.buyer_phone }, accessTokenHash: r.access_token_hash,
  paymentProvider: r.payment_provider as PaymentProviderId | null, paymentRef: r.payment_ref, paidAt: iso(r.paid_at), createdAt: iso(r.created_at)!
});

export const toPayment = (r: PaymentRow): Payment => ({
  id: r.id, orderId: r.order_id, provider: r.provider as PaymentProviderId, providerRef: r.provider_ref, amountVnd: r.amount_vnd,
  status: r.status === 'failed' ? 'failed' : 'succeeded', raw: r.raw, createdAt: iso(r.created_at)!
});

export class SupabaseRepository implements Repository {
  constructor(private readonly db: Db) {}

  async listProducts(): Promise<Product[]> {
    const { data, error } = await this.db.from('products').select('*').eq('active', true).order('sort').order('id');
    if (error) fail('list products', error);
    return data.map(toProduct);
  }

  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await this.db.from('products').select('*').eq('id', id).maybeSingle();
    if (error) fail(`product ${id}`, error);
    return data ? toProduct(data) : null;
  }

  async createGiftCard(input: NewGiftCard): Promise<GiftCard> {
    const { data, error } = await this.db.from('gift_cards').insert({
      slug: input.slug, product_id: input.productId, template: input.template, design: input.design, content: jsonb(input.content)
    }).select('*').single();
    if (error) fail(`gift card ${input.slug}`, error);
    return toGiftCard(data);
  }

  async getGiftCard(id: string): Promise<GiftCard | null> {
    if (!UUID.test(id)) return null;
    const { data, error } = await this.db.from('gift_cards').select('*').eq('id', id).maybeSingle();
    if (error) fail(`gift card ${id}`, error);
    return data ? toGiftCard(data) : null;
  }

  async getGiftCardBySlug(slug: string): Promise<GiftCard | null> {
    const { data, error } = await this.db.from('gift_cards').select('*').eq('slug', slug).maybeSingle();
    if (error) fail(`gift card ${slug}`, error);
    return data ? toGiftCard(data) : null;
  }

  async createOrder(input: NewOrder): Promise<Order> {
    const { data, error } = await this.db.from('orders').insert({
      code: input.code, gift_card_id: input.giftCardId, product_id: input.productId, amount_vnd: input.amountVnd,
      buyer_name: input.buyer.name, buyer_email: input.buyer.email, buyer_phone: input.buyer.phone, access_token_hash: input.accessTokenHash
    }).select('*').single();
    if (error) fail(`order ${input.code}`, error);
    return toOrder(data);
  }

  async getOrderByCode(code: string): Promise<Order | null> {
    if (!/^[0-9A-Z-]{1,32}$/.test(code)) return null;
    const { data, error } = await this.db.from('orders').select('*').eq('code', code).maybeSingle();
    if (error) fail(`order ${code}`, error);
    return data ? toOrder(data) : null;
  }

  async getOrder(id: string): Promise<Order | null> {
    if (!UUID.test(id)) return null;
    const { data, error } = await this.db.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) fail(`order ${id}`, error);
    return data ? toOrder(data) : null;
  }

  async setOrderPayment(orderId: string, provider: PaymentProviderId, ref: string): Promise<Order> {
    const { data, error } = await this.db.from('orders').update({ payment_provider: provider, payment_ref: ref })
      .eq('id', orderId).eq('status', 'pending').select('*').maybeSingle();
    if (error) fail(`order ${orderId}`, error);
    if (data) return toOrder(data);
    const now = await this.getOrder(orderId);
    if (!now) throw new RepositoryError(`no order ${orderId}`);
    throw new StateError(`order ${now.code} is ${now.status}`);
  }

  async confirmPayment(c: PaymentConfirmation): Promise<ConfirmedPayment> {
    if (!UUID.test(c.orderId)) throw new StateError(`no order ${c.orderId}`);
    const { data, error } = await this.db.rpc('confirm_order_payment', {
      p_order_id: c.orderId, p_provider: c.provider, p_ref: c.providerRef, p_amount: c.amountVnd,
      p_raw: jsonb(c.raw), p_paid_at: c.paidAt
    });
    if (error) fail(`confirm the payment of order ${c.orderId}`, error);
    const r = data as unknown as { order: OrderRow; gift_card: GiftRow; payment: PaymentRow; already_paid: boolean };
    return { order: toOrder(r.order), giftCard: toGiftCard(r.gift_card), payment: toPayment(r.payment), alreadyPaid: !!r.already_paid };
  }

  async recordEvent(e: AnalyticsEvent): Promise<void> {
    const { error } = await this.db.from('events').insert({
      name: e.name, session_id: e.sessionId ?? null, gift_card_id: e.giftCardId ?? null, order_id: e.orderId ?? null,
      product_id: e.productId ?? null, props: jsonb(e.props ?? {}), user_agent: e.userAgent?.slice(0, 512) ?? null,
      referrer: e.referrer?.slice(0, 2048) ?? null
    });
    if (error) fail(`event ${e.name}`, error);
  }
}
