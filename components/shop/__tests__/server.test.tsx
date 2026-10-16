// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/lib/domain/types';
import { AccessDenied, NotFound } from '@/lib/orders/errors';

const listProducts = vi.fn(), getOrderView = vi.fn();
vi.mock('@/lib/server/services', () => ({ getServices: () => ({ orders: { listProducts, getOrderView } }) }));
vi.mock('@/lib/server/order-cookie', () => ({ readOrderToken: vi.fn().mockResolvedValue('token') }));
vi.mock('../origin', () => ({ siteOrigin: vi.fn().mockResolvedValue('https://thiep.example') }));
vi.mock('next/image', () => ({ default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} /> }));
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); } }));

const { Shelf, ShelfSkeleton } = await import('../Shelf');
const { OrderGate } = await import('../OrderGate');

const p = (id: string, kind: Product['kind'], sort: number): Product => ({ id, template: id, design: null, name: id.toUpperCase(), blurb: null, kind, priceVnd: 49000, active: true, sort });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Shelf', () => {
  it('groups the cards: 3D acts, then films', async () => {
    listProducts.mockResolvedValue([p('mochi', '3d', 1), p('rain', 'film', 2), p('pip', '3d', 3)]);
    render(await Shelf());
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['Màn diễn 3D2', 'MOCHI', 'PIP', 'Phim trên thiệp1', 'RAIN']);
  });

  it('says so when the shelf is empty or cannot be read', async () => {
    listProducts.mockResolvedValue([]);
    render(await Shelf());
    expect(screen.getByText(/Kệ đang trống/)).toBeTruthy();
    cleanup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    listProducts.mockRejectedValue(new Error('db down'));
    render(await Shelf());
    expect(screen.getByText(/Chưa mở được kệ thiệp/)).toBeTruthy();
    render(<ShelfSkeleton />);
  });
});

describe('OrderGate', () => {
  const view = { id: 'o1', code: 'GC-1', status: 'pending', amountVnd: 1, product: { id: 'm', name: 'M', template: 'm' }, createdAt: '', paidAt: null, giftUrl: null };

  it('shows the order to the browser that placed it', async () => {
    getOrderView.mockResolvedValue(view);
    render(await OrderGate({ orderId: 'o1', children: v => <p>{v.code}</p> }));
    expect(screen.getByText('GC-1')).toBeTruthy();
    expect(getOrderView).toHaveBeenCalledWith('o1', 'token', 'https://thiep.example');
  });

  it('tells another browser politely, and a missing order is not found', async () => {
    getOrderView.mockRejectedValueOnce(new AccessDenied('no'));
    render(await OrderGate({ orderId: 'o1', children: () => null }));
    expect(screen.getByRole('heading').textContent).toMatch(/trình duyệt khác/);
    getOrderView.mockRejectedValueOnce(new NotFound('none'));
    await expect(OrderGate({ orderId: 'o2', children: () => null })).rejects.toThrow('NEXT_NOT_FOUND');
    getOrderView.mockRejectedValueOnce(new Error('db down'));
    await expect(OrderGate({ orderId: 'o3', children: () => null })).rejects.toThrow('db down');
  });
});
