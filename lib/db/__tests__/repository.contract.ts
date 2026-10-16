/* The Repository's rules, as one suite every implementation must pass (memory always, Supabase when configured). */
import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { GiftContent, OrderStatus, Product } from '../../domain/types';
import { RepositoryError, StateError, type Repository } from '../repository';

export interface RepoFixture {
  repo: Repository;
  /** already in the store: two active products (first sorts before second) and an inactive one */
  products: { first: Product; second: Product; hidden: Product };
  /** test only: put an order into a status the Repository itself never sets (e.g. cancelled) */
  setOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
  /** test only: how many events were recorded for this session id */
  countEvents(sessionId: string): Promise<number>;
}

/** Ids unique to one test run, so runs against a shared database never collide. */
export const runId = () => randomBytes(5).toString('hex');

export function testProducts(run: string): RepoFixture['products'] {
  const p = (suffix: string, sort: number, active: boolean): Product => ({
    id: `t${run}-${suffix}`, template: 'flower-letter', design: null, name: `Test ${suffix}`, blurb: null, kind: '3d', priceVnd: 49000, active, sort
  });
  return { first: p('a', -2, true), second: p('b', -1, true), hidden: p('z', -3, false) };
}

const content = (title = 'Gửi Hanna'): GiftContent => ({
  title, intro: 'Mở ra nhé', letter: { to: 'Hanna à,', body: ['Đoạn một.', 'Đoạn hai.'], from: 'Yêu em' },
  slots: { board: "Happy Women's Day" }, photoPath: null
});
const slug = () => randomBytes(9).toString('hex');
const code = () => `T-${randomBytes(6).toString('hex').toUpperCase()}`;
const tokenHash = () => createHash('sha256').update(randomBytes(16)).digest('hex');
const PAID_AT = '2026-10-16T08:00:00.000Z';

export function repositoryContract(name: string, setup: () => Promise<RepoFixture>) {
  describe(`${name}: the Repository contract`, () => {
    let fx: RepoFixture;
    const fixture = async () => (fx ??= await setup());

    /** a draft gift card and its pending order */
    async function bought(price = 49000) {
      const { repo, products } = await fixture();
      const gift = await repo.createGiftCard({ slug: slug(), productId: products.first.id, template: 'flower-letter', design: null, content: content() });
      const order = await repo.createOrder({ code: code(), giftCardId: gift.id, productId: products.first.id, amountVnd: price,
        buyer: { name: 'Tuấn', email: 'tuan@example.com', phone: null }, accessTokenHash: tokenHash() });
      return { repo, gift, order };
    }
    const confirm = (orderId: string, ref: string, amountVnd = 49000) =>
      fx.repo.confirmPayment({ orderId, provider: 'test', providerRef: ref, amountVnd, raw: { via: 'test' }, paidAt: PAID_AT });

    it('lists the active products in shelf order and hides the inactive ones', async () => {
      const { repo, products } = await fixture();
      const mine = (await repo.listProducts()).filter(p => p.id.startsWith(products.first.id.slice(0, -1)));
      expect(mine).toEqual([products.first, products.second]);
      expect(await repo.getProduct(products.hidden.id)).toEqual(products.hidden);   // still there, only off the shelf
    });

    it('finds a product by id, or nothing', async () => {
      const { repo, products } = await fixture();
      expect(await repo.getProduct(products.second.id)).toEqual(products.second);
      expect(await repo.getProduct('no-such-product')).toBeNull();
    });

    it('creates a draft gift card and finds it by id and by slug', async () => {
      const { repo, products } = await fixture();
      const s = slug();
      const g = await repo.createGiftCard({ slug: s, productId: products.first.id, template: 'flower-letter', design: null, content: content('Gửi Linh') });
      expect(g).toMatchObject({ slug: s, productId: products.first.id, template: 'flower-letter', design: null, status: 'draft', activatedAt: null });
      expect(g.content).toEqual(content('Gửi Linh'));
      expect(new Date(g.createdAt).toISOString()).toBe(g.createdAt);
      expect(await repo.getGiftCard(g.id)).toEqual(g);
      expect(await repo.getGiftCardBySlug(s)).toEqual(g);
    });

    it('finds no gift card for an unknown or malformed id or slug', async () => {
      const { repo } = await fixture();
      expect(await repo.getGiftCard('00000000-0000-4000-8000-000000000000')).toBeNull();
      expect(await repo.getGiftCard('not-a-uuid')).toBeNull();
      expect(await repo.getGiftCardBySlug('NoSuchSlug1')).toBeNull();
    });

    it('refuses a slug that is taken, and a product that does not exist', async () => {
      const { repo, products } = await fixture();
      const s = slug();
      await repo.createGiftCard({ slug: s, productId: products.first.id, template: 'flower-letter', design: null, content: content() });
      await expect(repo.createGiftCard({ slug: s, productId: products.first.id, template: 'flower-letter', design: null, content: content() }))
        .rejects.toBeInstanceOf(RepositoryError);
      await expect(repo.createGiftCard({ slug: slug(), productId: 'no-such-product', template: 'flower-letter', design: null, content: content() }))
        .rejects.toBeInstanceOf(RepositoryError);
    });

    it('creates a pending order and finds it; an order code is used once', async () => {
      const { repo, gift, order } = await bought();
      expect(order).toMatchObject({ giftCardId: gift.id, amountVnd: 49000, status: 'pending', buyer: { name: 'Tuấn', email: 'tuan@example.com', phone: null },
        paymentProvider: null, paymentRef: null, paidAt: null });
      expect(await repo.getOrder(order.id)).toEqual(order);
      expect(await repo.getOrder('00000000-0000-4000-8000-000000000000')).toBeNull();
      expect(await repo.getOrder('not-a-uuid')).toBeNull();
      await expect(repo.createOrder({ code: order.code, giftCardId: gift.id, productId: order.productId, amountVnd: 1, buyer: order.buyer, accessTokenHash: tokenHash() }))
        .rejects.toBeInstanceOf(RepositoryError);
    });

    it('remembers how a payment was started, while the order stays pending', async () => {
      const { repo, order } = await bought();
      const o = await repo.setOrderPayment(order.id, 'zalopay', '261016_abc');
      expect(o).toMatchObject({ status: 'pending', paymentProvider: 'zalopay', paymentRef: '261016_abc' });
      await expect(repo.setOrderPayment('00000000-0000-4000-8000-000000000000', 'test', 'x')).rejects.toBeInstanceOf(RepositoryError);
    });

    it('confirms a payment: the order is paid, its gift card active, the payment recorded', async () => {
      const { repo, gift, order } = await bought();
      const r = await confirm(order.id, `ref-${slug()}`);
      expect(r.alreadyPaid).toBe(false);
      expect(r.order).toMatchObject({ id: order.id, status: 'paid', paidAt: PAID_AT, paymentProvider: 'test' });
      expect(r.order.paymentRef).toBe(r.payment.providerRef);
      expect(r.giftCard).toMatchObject({ id: gift.id, status: 'active', activatedAt: PAID_AT });
      expect(r.payment).toMatchObject({ orderId: order.id, provider: 'test', amountVnd: 49000, status: 'succeeded', raw: { via: 'test' } });
      expect(await repo.getOrder(order.id)).toEqual(r.order);
      expect(await repo.getGiftCardBySlug(gift.slug)).toEqual(r.giftCard);
      await expect(repo.setOrderPayment(order.id, 'test', 'late')).rejects.toBeInstanceOf(StateError);
    });

    it('takes the same payment again as a repeat: nothing changes', async () => {
      const { order } = await bought();
      const ref = `ref-${slug()}`;
      const first = await confirm(order.id, ref);
      const again = await confirm(order.id, ref);
      expect(again.alreadyPaid).toBe(true);
      expect(again.payment).toEqual(first.payment);
      expect(again.order).toEqual(first.order);
      expect(again.giftCard).toEqual(first.giftCard);
    });

    it('refuses another payment for an order already paid', async () => {
      const { order } = await bought();
      await confirm(order.id, `ref-${slug()}`);
      await expect(confirm(order.id, `ref-${slug()}`)).rejects.toBeInstanceOf(StateError);
    });

    it('refuses a payment of the wrong amount, and the order stays pending', async () => {
      const { repo, gift, order } = await bought();
      await expect(confirm(order.id, `ref-${slug()}`, 1000)).rejects.toBeInstanceOf(StateError);
      expect((await repo.getOrder(order.id))?.status).toBe('pending');
      expect((await repo.getGiftCard(gift.id))?.status).toBe('draft');
    });

    it('refuses a payment for an order that is not pending', async () => {
      const { repo, gift, order } = await bought();
      await fx.setOrderStatus(order.id, 'cancelled');
      await expect(confirm(order.id, `ref-${slug()}`)).rejects.toBeInstanceOf(StateError);
      expect((await repo.getGiftCard(gift.id))?.status).toBe('draft');
    });

    it('refuses a payment for an order that does not exist', async () => {
      await fixture();
      await expect(confirm('00000000-0000-4000-8000-000000000000', `ref-${slug()}`)).rejects.toBeInstanceOf(StateError);
    });

    it('lets one provider payment pay one order only', async () => {
      const a = await bought(), b = await bought();
      const ref = `ref-${slug()}`;
      await confirm(a.order.id, ref);
      await expect(confirm(b.order.id, ref)).rejects.toBeInstanceOf(StateError);
      expect((await b.repo.getOrder(b.order.id))?.status).toBe('pending');
    });

    it('records events', async () => {
      const { repo, gift, order, } = await bought();
      const session = `s-${slug()}`;
      await repo.recordEvent({ name: 'gift_open', sessionId: session, giftCardId: gift.id, orderId: order.id, productId: order.productId,
        props: { mode: 'ar', chapters: 2, framed: false, ref: null }, userAgent: 'test', referrer: null });
      await repo.recordEvent({ name: 'ar_start', sessionId: session });
      expect(await fx.countEvents(session)).toBe(2);
    });
  });
}
