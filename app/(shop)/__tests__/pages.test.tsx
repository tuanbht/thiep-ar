// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OrderView } from '@/lib/api/dto';
import type { FormSpec } from '@/lib/catalog/form';
import type { Product } from '@/lib/domain/types';
import { resetServerEnv } from '@/lib/server/env';

const getProduct = vi.fn(), getTemplateInfo = vi.fn();
vi.mock('@/lib/server/services', () => ({ getServices: () => ({ orders: { getProduct } }) }));
vi.mock('@/lib/catalog/templates', () => ({ getTemplateInfo: (id: string) => getTemplateInfo(id) }));
vi.mock('@/components/shop/Shelf', () => ({ Shelf: () => <p>shelf</p>, ShelfSkeleton: () => <p>…</p> }));
vi.mock('@/components/shop/CustomizeForm', () => ({ CustomizeForm: ({ product }: { product: { id: string } }) => <p data-testid="form">{product.id}</p> }));
vi.mock('@/components/shop/OrderStatus', () => ({ OrderStatus: ({ initial }: { initial: OrderView }) => <p data-testid="status">{initial.status}</p> }));
let gateView: OrderView;
vi.mock('@/components/shop/OrderGate', () => ({ OrderGate: ({ children }: { children: (v: OrderView) => React.ReactNode }) => <>{children(gateView)}</> }));
vi.mock('@/components/shop/PayButton', () => ({ PayButton: ({ auto }: { auto?: boolean }) => <button type="button">{auto ? 'pay (qr at once)' : 'pay'}</button> }));
vi.mock('next/image', () => ({ default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} /> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));

const product: Product = { id: 'mochi', template: 'mochi', design: null, name: 'Mochi', blurb: 'A rice cake', kind: '3d', priceVnd: 49000, active: true, sort: 1 };
const form: FormSpec = { label: 'Mochi', preset: { title: '', intro: '', to: '', body: [], from: '' }, groups: [] };
const params = <T,>(p: T) => ({ params: Promise.resolve(p), searchParams: Promise.resolve({}) });
const view = (over: Partial<OrderView> = {}): OrderView => ({ id: 'o1', code: 'GC-261016-ABCDE', status: 'pending', amountVnd: 49000,
  product: { id: 'mochi', name: 'Mochi', template: 'mochi' }, createdAt: '', paidAt: null, giftUrl: null, ...over });

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('the shop pages', () => {
  it('home: the hero, how it works and the shelf', async () => {
    const { default: Home } = await import('../page');
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Gửi mộtlá thưbiết cử động');
    expect(screen.getByText('Ba bước, một buổi tối')).toBeTruthy();
    expect(screen.getByText('shelf')).toBeTruthy();
  });

  it('product: the card, its price and its form; not found when it is not on sale', async () => {
    const { default: ProductPage, generateMetadata } = await import('../cards/[productId]/page');
    getProduct.mockResolvedValue(product);
    getTemplateInfo.mockResolvedValue({ id: 'mochi', name: 'Mochi', kind: '3d', aspect: 0.625, chapters: 2, form });
    render(await ProductPage(params({ productId: 'mochi' }) as PageProps<'/cards/[productId]'>));
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Mochi');
    expect(screen.getByTestId('form').textContent).toBe('mochi');
    expect(await generateMetadata(params({ productId: 'mochi' }) as PageProps<'/cards/[productId]'>)).toMatchObject({ title: 'Mochi' });
    cleanup();
    getTemplateInfo.mockResolvedValue({ id: 'mochi', name: 'Mochi', kind: '3d', aspect: 0.625, chapters: 2, form: null });
    render(await ProductPage(params({ productId: 'mochi' }) as PageProps<'/cards/[productId]'>));
    expect(screen.getByText(/chưa mở bán/)).toBeTruthy();
    getProduct.mockResolvedValue({ ...product, active: false });
    await expect(ProductPage(params({ productId: 'mochi' }) as PageProps<'/cards/[productId]'>)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(await generateMetadata(params({ productId: 'mochi' }) as PageProps<'/cards/[productId]'>)).toEqual({});
  });

  it('checkout: the slip and the pay button; with SePay the QR code is shown at once', async () => {
    const { default: Checkout } = await import('../checkout/[orderId]/page');
    gateView = view();
    vi.stubEnv('PAYMENT_PROVIDER', 'test');
    resetServerEnv();
    render(await Checkout(params({ orderId: 'o1' }) as PageProps<'/checkout/[orderId]'>));
    expect(screen.getAllByText('GC-261016-ABCDE').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'pay' })).toBeTruthy();
    cleanup();
    vi.stubEnv('PAYMENT_PROVIDER', 'sepay');
    resetServerEnv();
    render(await Checkout(params({ orderId: 'o1' }) as PageProps<'/checkout/[orderId]'>));
    expect(screen.getByRole('button', { name: 'pay (qr at once)' })).toBeTruthy();
    vi.unstubAllEnvs();
    resetServerEnv();
    cleanup();
    gateView = view({ status: 'paid' });
    render(await Checkout(params({ orderId: 'o1' }) as PageProps<'/checkout/[orderId]'>));
    expect(screen.getByRole('link', { name: 'Xem đơn' }).getAttribute('href')).toBe('/orders/o1');
  });

  it('order: its status', async () => {
    const { default: Order } = await import('../orders/[orderId]/page');
    gateView = view({ status: 'paid' });
    render(await Order(params({ orderId: 'o1' }) as PageProps<'/orders/[orderId]'>));
    expect(screen.getByTestId('status').textContent).toBe('paid');
  });

  it('the layout, the loading states', async () => {
    const { default: Layout } = await import('../layout');
    render(<Layout><p>inside</p></Layout>);
    expect(screen.getByText('inside')).toBeTruthy();
    for (const m of [await import('../cards/[productId]/loading'), await import('../checkout/[orderId]/loading'), await import('../orders/[orderId]/loading')]) {
      cleanup();
      render(<m.default />);
      expect(screen.getByText('Đang mở…')).toBeTruthy();
    }
  });
});
