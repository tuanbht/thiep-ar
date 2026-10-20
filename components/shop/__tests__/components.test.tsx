// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OrderView } from '@/lib/api/dto';
import type { Product } from '@/lib/domain/types';

vi.mock('next/image', () => ({ default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} /> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('qrcode', () => ({ default: { toString: vi.fn().mockResolvedValue('<svg data-qr="1"></svg>') } }));

const { Field } = await import('../fields');
const { ProductCard } = await import('../ProductCard');
const { OrderStatus } = await import('../OrderStatus');
const { GiftLink } = await import('../GiftLink');
const { PhotoField } = await import('../PhotoField');

const product: Product = { id: 'mochi', template: 'mochi', design: null, name: 'Mochi', blurb: 'A rice cake runs', kind: '3d', priceVnd: 49000, active: true, sort: 1 };
const view = (over: Partial<OrderView> = {}): OrderView => ({
  id: 'o1', code: 'GC-261016-ABCDE', status: 'pending', amountVnd: 49000, product: { id: 'mochi', name: 'Mochi', template: 'mochi' },
  createdAt: '2026-10-16T03:00:00Z', paidAt: null, giftUrl: null, ...over
});

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Field', () => {
  it('counts the letters against its limit and says when it is too long', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Field label="Note" value="Hi" max={4} onChange={onChange} required />);
    expect(screen.getByText('2/4')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Note/), { target: { value: 'Hello' } });
    expect(onChange).toHaveBeenCalledWith('Hello');
    rerender(<Field label="Note" value="Hello" max={4} onChange={onChange} />);
    expect(screen.getByRole('alert').textContent).toContain('4');
    expect(screen.getByLabelText(/Note/).getAttribute('aria-invalid')).toBe('true');
  });

  it('shows its own error and a hint, and can be a text area', () => {
    render(<Field label="Đoạn" value="" multiline onChange={() => undefined} error="Cần điền" hint="Một hai câu" />);
    expect(screen.getByLabelText('Đoạn').tagName).toBe('TEXTAREA');
    expect(screen.getByRole('alert').textContent).toBe('Cần điền');
    expect(screen.getByText('Một hai câu')).toBeTruthy();
  });
});

describe('ProductCard', () => {
  it('links to the product with its print, kind and price', () => {
    render(<ProductCard product={product} feature />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/cards/mochi');
    expect(link.getAttribute('aria-label')).toMatch(/Mochi, 49\.000/);
    expect(screen.getByText('Diễn 3D')).toBeTruthy();
    expect(document.querySelector('img')?.getAttribute('src')).toBe('/thumbs/mochi.jpg');
  });
});

describe('OrderStatus', () => {
  it('shows the gift link, its QR code and how to send it once paid', async () => {
    render(<OrderStatus initial={view({ status: 'paid', paidAt: '2026-10-16T03:05:00Z', giftUrl: 'https://thiep.example/g/AbC123xyz0' })} />);
    expect(screen.getByTestId('gift-url').textContent).toBe('https://thiep.example/g/AbC123xyz0');
    await waitFor(() => expect(document.querySelector('[data-qr]')).toBeTruthy());
    expect(screen.getByText('Gửi thiệp thế nào')).toBeTruthy();
  });

  it('asks the server every 2 s while it waits for payment, and shows the link when it is paid', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(view()), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(view({ status: 'paid', giftUrl: 'https://thiep.example/g/AbC123xyz0' })), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    render(<OrderStatus initial={view()} />);
    expect(screen.getByText('Đang chờ thanh toán')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fetch).toHaveBeenCalledWith('/api/orders/o1', { cache: 'no-store' });
    expect(screen.getByTestId('gift-url')).toBeTruthy();
  });

  it('gives up waiting after two minutes, and offers to pay again after a failure', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(view()), { status: 200 })));
    render(<OrderStatus initial={view()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(124_000); });
    expect(screen.getByText(/Vẫn chưa thấy thanh toán/)).toBeTruthy();
    cleanup();
    render(<OrderStatus initial={view({ status: 'failed' })} />);
    expect(screen.getByRole('link', { name: 'Thanh toán lại' }).getAttribute('href')).toBe('/checkout/o1');
  });
});

describe('GiftLink', () => {
  it('copies the link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<GiftLink url="https://thiep.example/g/AbC123xyz0" />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Chép link' })); });
    expect(writeText).toHaveBeenCalledWith('https://thiep.example/g/AbC123xyz0');
    expect(screen.getByRole('button', { name: 'Đã chép' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Mở thiệp/ }).getAttribute('href')).toBe('https://thiep.example/g/AbC123xyz0');
  });
});

describe('PhotoField', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:local');
    URL.revokeObjectURL = vi.fn();
  });
  const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'a', { type });

  it('refuses what is not a photo or is too big', async () => {
    const onChange = vi.fn();
    const { container } = render(<PhotoField value={{ path: null, previewUrl: null }} onChange={onChange} />);
    const input = container.querySelector('input[type=file]')!;
    await act(async () => { fireEvent.change(input, { target: { files: [file('image/gif')] } }); });
    expect(screen.getByRole('alert').textContent).toMatch(/JPG, PNG/);
    await act(async () => { fireEvent.change(input, { target: { files: [file('image/png', 6 * 1024 * 1024)] } }); });
    expect(screen.getByRole('alert').textContent).toMatch(/5 MB/);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the photo at once and keeps the stored path once uploaded', async () => {
    const onChange = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ photoPath: 'drafts/x.png', previewUrl: 'https://s/x' }), { status: 201 })));
    const { container } = render(<PhotoField value={{ path: null, previewUrl: null }} onChange={onChange} />);
    await act(async () => { fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file('image/png')] } }); });
    expect(onChange).toHaveBeenNthCalledWith(1, { path: null, previewUrl: 'blob:local' });
    expect(onChange).toHaveBeenLastCalledWith({ path: 'drafts/x.png', previewUrl: 'blob:local' });
  });

  it('drops the photo when the upload fails, and can be cleared', async () => {
    const onChange = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Ảnh hỏng' }), { status: 400 })));
    const { container, rerender } = render(<PhotoField value={{ path: null, previewUrl: null }} onChange={onChange} />);
    await act(async () => { fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file('image/jpeg')] } }); });
    expect(screen.getByRole('alert').textContent).toBe('Ảnh hỏng');
    expect(onChange).toHaveBeenLastCalledWith({ path: null, previewUrl: null });
    rerender(<PhotoField value={{ path: 'drafts/x.png', previewUrl: 'blob:local' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh' }));
    expect(onChange).toHaveBeenLastCalledWith({ path: null, previewUrl: null });
  });
});
