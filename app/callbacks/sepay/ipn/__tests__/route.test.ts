import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetServerEnv } from '@/lib/server/env';

const notifyPayment = vi.fn();
vi.mock('@/lib/server/services', () => ({ getServices: () => ({ orders: { notifyPayment } }) }));
const { POST } = await import('../route');

const SECRET = 'spsk_test_secret_123456';
const webhook = (body: object, headers: Record<string, string> = {}) =>
  POST(new Request('https://shop.test/callbacks/sepay/ipn', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
const signed = (body: object) => {
  const raw = JSON.stringify(body), ts = Math.floor(Date.now() / 1000);
  return { 'x-sepay-timestamp': String(ts), 'x-sepay-signature': `sha256=${createHmac('sha256', SECRET).update(`${ts}.${raw}`).digest('hex')}` };
};
const money = { id: 92704, gateway: 'TPBank', transferType: 'in', transferAmount: 49000, content: 'NGUYEN VAN A GC2610207K3QX', code: null };

describe('POST /callbacks/sepay/ipn', () => {
  afterEach(() => { vi.unstubAllEnvs(); resetServerEnv(); notifyPayment.mockReset(); });
  const withSecret = () => { vi.stubEnv('SEPAY_WEBHOOK_SECRET', SECRET); resetServerEnv(); };

  it('looks for the payment of the order the transfer names, and says {"success": true}', async () => {
    withSecret();
    notifyPayment.mockResolvedValue('paid');
    const res = await webhook(money, signed(money));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(notifyPayment).toHaveBeenCalledWith('GC-261020-7K3QX');
  });

  it('refuses a request that is not signed with the secret', async () => {
    withSecret();
    expect((await webhook(money)).status).toBe(401);
    expect((await webhook(money, { ...signed(money), 'x-sepay-signature': 'sha256=00' })).status).toBe(401);
    expect(notifyPayment).not.toHaveBeenCalled();
  });

  it('says success for money that names no order, or goes out, without looking', async () => {
    withSecret();
    for (const body of [{ ...money, content: 'an trua' }, { ...money, transferType: 'out' }]) {
      const res = await webhook(body, signed(body));
      expect(await res.json()).toEqual({ success: true });
    }
    expect(notifyPayment).not.toHaveBeenCalled();
  });

  it('answers 500 when the check fails, so SePay sends it again', async () => {
    withSecret();
    notifyPayment.mockRejectedValue(new Error('database down'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await webhook(money, signed(money))).status).toBe(500);
    err.mockRestore();
  });
});
