// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormSpec } from '@/lib/catalog/form';
import type { Product } from '@/lib/domain/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../PreviewPanel', () => ({ PreviewPanel: ({ card }: { card: { slots: Record<string, string> } }) => <div data-testid="preview">{card.slots.board}</div> }));

const { CustomizeForm } = await import('../CustomizeForm');

const product: Product = { id: 'flower-letter', template: 'flower-letter', design: null, name: 'Thư hoa', blurb: null, kind: '3d', priceVnd: 49000, active: true, sort: 0 };
const form: FormSpec = {
  label: 'Thư hoa',
  preset: { title: 'Thư hoa', intro: 'Lay the card flat', to: 'Dear you,', body: ['Some flowers'], from: 'With love' },
  groups: [{ title: 'The note', note: 'Up to 40 letters', rows: [[{ slot: 'board', label: 'Note', value: "Happy Women's Day!", max: 40 }]] }]
};

let desktop = true;
beforeEach(() => {
  desktop = true;
  push.mockReset();
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: desktop, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const calls = (fetch: ReturnType<typeof vi.fn>, url: string) => fetch.mock.calls.filter(c => c[0] === url);

describe('CustomizeForm', () => {
  it('opens with the template\'s words, previews what is written and counts the visit', () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    render(<CustomizeForm product={product} form={form} />);
    expect((screen.getByLabelText(/Tiêu đề/) as HTMLInputElement).value).toBe('Thư hoa');
    fireEvent.change(screen.getByLabelText(/^Note/), { target: { value: 'Chúc mừng 20/10' } });
    expect(screen.getByTestId('preview').textContent).toBe('Chúc mừng 20/10');
    const names = calls(fetch, '/api/events').map(c => JSON.parse(c[1].body).name);
    expect(names).toEqual(expect.arrayContaining(['product_view', 'preview_open', 'customize_start']));
    expect(screen.queryByText('Lời nhắc ở mỗi điểm dừng')).toBeNull();          // the stops' words are the player's, not the buyer's
  });

  it('will not send a card without a title, and says where', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    render(<CustomizeForm product={product} form={form} />);
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: '  ' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
    expect(screen.getAllByRole('alert').map(a => a.textContent)).toEqual(expect.arrayContaining(['Cần điền', 'Còn vài chỗ cần sửa phía trên.']));
    expect(calls(fetch, '/api/orders')).toHaveLength(0);
  });

  it('places the order and goes to the checkout', async () => {
    const fetch = vi.fn().mockImplementation(async (url: string) => url === '/api/orders'
      ? new Response(JSON.stringify({ orderId: 'o1', code: 'GC-1', checkoutUrl: '/checkout/o1' }), { status: 201 })
      : new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    render(<CustomizeForm product={product} form={form} />);
    fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Gửi Hanna' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm đoạn/ }));
    fireEvent.change(screen.getByLabelText(/Đoạn 2/), { target: { value: 'Yêu em' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
    await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/o1'));
    const body = JSON.parse(calls(fetch, '/api/orders')[0][1].body);
    expect(body).toMatchObject({ productId: 'flower-letter', content: { title: 'Gửi Hanna', letter: { body: ['Some flowers', 'Yêu em'] }, slots: { board: "Happy Women's Day!" } } });
    expect(body).not.toHaveProperty('buyer');                          // the shop no longer asks who is sending it
    expect(screen.getByRole('button', { name: /Đang tạo đơn/ }).hasAttribute('disabled')).toBe(true);
  });

  it('shows the server\'s reason when the order is refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => url === '/api/orders'
      ? new Response(JSON.stringify({ error: 'Tấm thiệp này không còn bán' }), { status: 404 })
      : new Response(null, { status: 204 })));
    render(<CustomizeForm product={product} form={form} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
    expect((await screen.findByText('Tấm thiệp này không còn bán')).getAttribute('role')).toBe('alert');
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Mua thiệp/ }).hasAttribute('disabled')).toBe(false);   // free to try again
  });

  it('keeps the preview folded away on a phone until asked', () => {
    desktop = false;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    render(<CustomizeForm product={product} form={form} />);
    expect(screen.queryByTestId('preview')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Hiện bản xem trước' }));
    expect(screen.getByTestId('preview')).toBeTruthy();
  });

  it('adds and removes paragraphs of the letter', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    render(<CustomizeForm product={product} form={form} />);
    fireEvent.click(screen.getByRole('button', { name: /Thêm đoạn/ }));
    expect(screen.getAllByRole('button', { name: /Bỏ đoạn này/ })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: /Bỏ đoạn này/ })[0]);
    expect(screen.queryByLabelText(/Đoạn 2/)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Lời mở thư/), { target: { value: 'Em,' } });
    fireEvent.change(screen.getByLabelText(/Lời ký tên/), { target: { value: 'Anh' } });
    fireEvent.change(screen.getByLabelText(/Lời dẫn/), { target: { value: 'Mở đi' } });
    expect((screen.getByLabelText(/Lời ký tên/) as HTMLInputElement).value).toBe('Anh');
    expect(screen.queryByLabelText('Email')).toBeNull();                // no buyer section
    expect(screen.queryByText('Người gửi')).toBeNull();
  });

  it('flags a field that is too long once it is left, and the empty letter on buying', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    render(<CustomizeForm product={product} form={form} />);
    const note = screen.getByLabelText(/^Note/);
    fireEvent.change(note, { target: { value: 'x'.repeat(41) } });
    fireEvent.blur(note);
    expect(await screen.findByText('Tối đa 40 ký tự')).toBeTruthy();
    fireEvent.change(note, { target: { value: 'ok' } });
    fireEvent.change(screen.getByLabelText(/Đoạn 1/), { target: { value: '   ' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
    expect(screen.getAllByRole('alert').map(a => a.textContent)).toEqual(expect.arrayContaining(['Cần điền']));
    expect(calls(fetch, '/api/orders')).toHaveLength(0);
  });
});
