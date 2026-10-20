// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Activity } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FormSpec } from '@/lib/catalog/form';
import type { Product } from '@/lib/domain/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('../PreviewPanel', () => ({ PreviewPanel: ({ card }: { card: { slots: Record<string, string> } }) => <div data-testid="preview">{card.slots.board}</div> }));

const { CustomizeForm } = await import('../CustomizeForm');
const { releaseDraft } = await import('../draftStore');

const product: Product = { id: 'flower-letter', template: 'flower-letter', design: null, name: 'Thư hoa', blurb: null, kind: '3d', priceVnd: 49000, active: true, sort: 0,
  tags: [], categories: [] };
const form: FormSpec = {
  label: 'Thư hoa',
  preset: { title: 'Thư hoa', intro: 'Lay the card flat', to: 'Dear you,', body: ['Some flowers'], from: 'With love' },
  groups: [{ title: 'The note', note: 'Up to 40 letters', rows: [[{ slot: 'board', label: 'Note', value: "Happy Women's Day!", max: 40 }]] }]
};

let desktop = true;
beforeEach(() => {
  desktop = true;
  push.mockReset();
  localStorage.clear();
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: desktop, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

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

  describe('the draft kept in this browser', () => {
    const PATH = 'drafts/0b5c2a52-6a8e-4a43-9c7f-3d2b1e0f9a11.jpg';
    const quiet = () => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    const ordering = () => vi.fn().mockImplementation(async (url: string) => url === '/api/orders'
      ? new Response(JSON.stringify({ orderId: 'o1', code: 'GC-1', checkoutUrl: '/checkout/o1' }), { status: 201 })
      : new Response(null, { status: 204 }));
    const saved = () => JSON.parse(localStorage.getItem('gc:draft:flower-letter') ?? 'null');
    const keep = (over: object = {}) => localStorage.setItem('gc:draft:flower-letter', JSON.stringify({ v: 1, savedAt: Date.now() - 60_000, photo: null,
      values: { title: 'Gửi Hanna', intro: '', to: 'Em ơi,', body: [{ text: 'Đoạn một' }, { text: 'Đoạn hai' }], from: 'Anh', words: { board: 'Thương em' } },
      ...over }));
    const title = () => (screen.getByLabelText(/Tiêu đề/) as HTMLInputElement).value;
    const opened = () => act(async () => { await new Promise(r => setTimeout(r, 5)); });   // the draft is looked for just after mounting
    const pickPhoto = () => fireEvent.change(document.querySelector('input[type=file]')!,
      { target: { files: [new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' })] } });
    /** the page as the shop's router keeps it while the buyer is elsewhere: hidden, its state intact */
    const page = (mode: 'visible' | 'hidden') => <Activity mode={mode}><CustomizeForm product={product} form={form} /></Activity>;

    beforeEach(() => {                                                  // jsdom has no object URLs
      Object.assign(URL, { createObjectURL: () => 'blob:local', revokeObjectURL: () => undefined });
    });
    afterEach(() => {
      for (const k of ['createObjectURL', 'revokeObjectURL'] as const) Reflect.deleteProperty(URL, k);
    });

    it('says from the start that it keeps a draft, then keeps what is written a moment after each change', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      quiet();
      render(<CustomizeForm product={product} form={form} />);
      expect(screen.getByText('Bản nháp tự lưu trên máy này')).toBeTruthy();   // the line is there before any save: nothing jumps
      fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Gửi Hanna' } });
      await act(async () => { await vi.advanceTimersByTimeAsync(600); });
      expect(saved()).toMatchObject({ v: 1, values: { title: 'Gửi Hanna', words: { board: "Happy Women's Day!" } }, photo: null });
      expect(screen.getByText(/^Đã lưu nháp lúc \d\d:\d\d$/)).toBeTruthy();
    });

    it('brings the draft back after a reload with its photo, sends that photo, and ties the draft to the order', async () => {
      keep({ photo: { path: PATH, preview: 'data:image/jpeg;base64,AAAA', uploadedAt: Date.now() - 60_000 } });
      const fetch = ordering();
      vi.stubGlobal('fetch', fetch);
      render(<CustomizeForm product={product} form={form} />);
      await waitFor(() => expect(title()).toBe('Gửi Hanna'));
      expect((screen.getByLabelText(/Đoạn 2/) as HTMLTextAreaElement).value).toBe('Đoạn hai');
      expect(screen.getByTestId('preview').textContent).toBe('Thương em');
      expect(screen.getByText(/^Đã mở lại bản nháp lúc/)).toBeTruthy();
      expect(document.querySelector('img[src^="data:image/jpeg"]')).toBeTruthy();
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
      await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/o1'));
      expect(JSON.parse(calls(fetch, '/api/orders')[0][1].body).content.photoPath).toBe(PATH);
      expect(saved().orderId).toBe('o1');                              // paying that order lets the draft go
    });

    it('starts over when asked twice', async () => {
      keep();
      quiet();
      render(<CustomizeForm product={product} form={form} />);
      await waitFor(() => expect(title()).toBe('Gửi Hanna'));
      fireEvent.click(screen.getByRole('button', { name: 'Viết lại từ đầu' }));
      expect(title()).toBe('Gửi Hanna');                                // one click only asks
      fireEvent.click(screen.getByRole('button', { name: /Bấm lần nữa/ }));
      await waitFor(() => expect(title()).toBe('Thư hoa'));
      expect(screen.queryByLabelText(/Đoạn 2/)).toBeNull();
      expect(saved()).toBeNull();
      expect(screen.getByText('Bản nháp tự lưu trên máy này')).toBeTruthy();
    });

    it.each([
      ['too old to keep', { path: PATH, preview: 'data:image/jpeg;base64,AAAA', uploadedAt: Date.now() - 2 * 24 * 3600_000 }],
      ['kept without its preview', { path: PATH, preview: null, uploadedAt: Date.now() - 60_000 }]
    ])('asks for the photo again when the draft\'s is %s, and sends none', async (_, photo) => {
      keep({ photo });
      const fetch = ordering();
      vi.stubGlobal('fetch', fetch);
      render(<CustomizeForm product={product} form={form} />);
      expect(await screen.findByText(/chọn lại ảnh/)).toBeTruthy();
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
      await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/o1'));
      expect(JSON.parse(calls(fetch, '/api/orders')[0][1].body).content.photoPath ?? null).toBeNull();
    });

    it('keeps an uploaded photo in the draft', async () => {
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => url === '/api/uploads'
        ? new Response(JSON.stringify({ photoPath: PATH, previewUrl: 'https://signed.example/p' }), { status: 201 })
        : new Response(null, { status: 204 })));
      render(<CustomizeForm product={product} form={form} />);
      await opened();
      pickPhoto();
      await waitFor(() => expect(saved()?.photo?.path).toBe(PATH));
    });

    it('will not start over while a photo is uploading (it would come back when the upload ends)', async () => {
      keep();
      vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => url === '/api/uploads'
        ? new Promise(() => undefined) : Promise.resolve(new Response(null, { status: 204 }))));
      render(<CustomizeForm product={product} form={form} />);
      await waitFor(() => expect(title()).toBe('Gửi Hanna'));
      pickPhoto();
      await waitFor(() => expect((screen.getByRole('button', { name: 'Viết lại từ đầu' }) as HTMLButtonElement).disabled).toBe(true));
    });

    describe('when the shop keeps the page while the buyer is elsewhere (back from the checkout)', () => {
      it('comes back as it was, with Buy usable again', async () => {
        vi.stubGlobal('fetch', ordering());
        const view = render(page('visible'));
        await opened();
        fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Gửi Hanna' } });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
        await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/o1'));
        view.rerender(page('hidden'));
        view.rerender(page('visible'));
        await opened();
        expect(title()).toBe('Gửi Hanna');
        expect((screen.getByRole('button', { name: /Mua thiệp/ }) as HTMLButtonElement).disabled).toBe(false);
      });

      it('keeps what was typed a moment before the page was left', async () => {
        quiet();
        const view = render(page('visible'));
        await opened();
        fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Gửi Hanna' } });
        view.rerender(page('hidden'));                                  // no time for the usual pause
        expect(saved()?.values.title).toBe('Gửi Hanna');
      });

      it('starts afresh once its own order is paid, and not for another order', async () => {
        vi.stubGlobal('fetch', ordering());
        const view = render(page('visible'));
        await opened();
        fireEvent.change(screen.getByLabelText(/Tiêu đề/), { target: { value: 'Gửi Hanna' } });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Mua thiệp/ })); });
        await waitFor(() => expect(push).toHaveBeenCalledWith('/checkout/o1'));
        view.rerender(page('hidden'));
        releaseDraft('flower-letter', 'o2');                             // another order of this card was paid
        view.rerender(page('visible'));
        await opened();
        expect(title()).toBe('Gửi Hanna');
        view.rerender(page('hidden'));
        releaseDraft('flower-letter', 'o1');                             // the order page, once this one is paid
        view.rerender(page('visible'));
        await waitFor(() => expect(title()).toBe('Thư hoa'));
        expect(saved()).toBeNull();
      });
    });
  });
});
