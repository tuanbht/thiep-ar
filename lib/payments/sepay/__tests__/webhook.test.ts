import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { orderCodeOfWebhook, webhookAllowed } from '../webhook';

const body = JSON.stringify({ id: 92704, transferType: 'in', transferAmount: 49000, content: 'ck GC2610207K3QX', code: null });
const sign = (secret: string, ts: number, raw: string) => `sha256=${createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')}`;
const NOW = 1_800_000_000;

describe('webhookAllowed', () => {
  it('takes a fresh HMAC-SHA256 signature over the timestamp and the raw body', () => {
    const h = new Headers({ 'x-sepay-signature': sign('spsk_secret', NOW, body), 'x-sepay-timestamp': String(NOW) });
    expect(webhookAllowed(h, body, { secret: 'spsk_secret' }, NOW)).toBe(true);
    expect(webhookAllowed(h, body.replace('49000', '9'), { secret: 'spsk_secret' }, NOW)).toBe(false);   // the body changed
    expect(webhookAllowed(h, body, { secret: 'another' }, NOW)).toBe(false);
    expect(webhookAllowed(h, body, { secret: 'spsk_secret' }, NOW + 301)).toBe(false);                  // a replay
  });

  it('takes the API key when that is how the webhook is set up', () => {
    expect(webhookAllowed(new Headers({ authorization: 'Apikey key-123456' }), body, { apiKey: 'key-123456' })).toBe(true);
    expect(webhookAllowed(new Headers({ authorization: 'Apikey nope-0000' }), body, { apiKey: 'key-123456' })).toBe(false);
    expect(webhookAllowed(new Headers({ authorization: 'Bearer key-123456' }), body, { apiKey: 'key-123456' })).toBe(false);
  });

  it('refuses an unsigned request when a secret is set, and lets anything through when nothing is', () => {
    expect(webhookAllowed(new Headers(), body, { secret: 'spsk_secret' })).toBe(false);
    expect(webhookAllowed(new Headers(), body, {})).toBe(true);
  });
});

describe('orderCodeOfWebhook', () => {
  it('reads the order from money coming in, never from money going out', () => {
    expect(orderCodeOfWebhook(JSON.parse(body))).toBe('GC-261020-7K3QX');
    expect(orderCodeOfWebhook({ transferType: 'in', code: 'GC2610207K3QX' })).toBe('GC-261020-7K3QX');
    expect(orderCodeOfWebhook({ transferType: 'out', content: 'GC2610207K3QX' })).toBeNull();
    expect(orderCodeOfWebhook({ transferType: 'in', content: 'an trua' })).toBeNull();
  });
});
