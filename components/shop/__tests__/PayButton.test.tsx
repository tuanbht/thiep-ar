// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const { PayButton } = await import('../PayButton');

const QR = { imageUrl: 'https://qr.sepay.vn/img?acc=0123', bankName: 'TPBank', accountNumber: '0123456789', accountName: 'SHOP', amountVnd: 49000, content: 'GC2610207K3QX' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); push.mockReset(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('PayButton', () => {
  it('shows the QR code and the transfer to make, then the order once the money is in', async () => {
    let paid = false;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.endsWith('/pay') ? json({ qr: QR }) : json({ id: 'o1', status: paid ? 'paid' : 'pending' }))));
    render(<PayButton orderId="o1" auto />);
    expect(await screen.findByTestId('qr-payment')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Mã QR chuyển khoản cho đơn này' }).getAttribute('src')).toBe(QR.imageUrl);
    expect(screen.getByText('GC2610207K3QX')).toBeTruthy();
    expect(screen.getByText('0123456789')).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(push).not.toHaveBeenCalled();
    paid = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(push).toHaveBeenCalledWith('/orders/o1');
  });

  it('goes to the order when the payment is done at once (the test provider)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ redirect: '/orders/o1' })));
    render(<PayButton orderId="o1" />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Thanh toán/ })); });
    expect(push).toHaveBeenCalledWith('/orders/o1');
  });

  it('says why when paying cannot start', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'Thanh toán đang tạm ngưng.' }, 503)));
    render(<PayButton orderId="o1" />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Thanh toán/ })); });
    expect((await screen.findByRole('alert')).textContent).toBe('Thanh toán đang tạm ngưng.');
  });
});
