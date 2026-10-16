import { describe, expect, it } from 'vitest';
import { eventRequestSchema } from '../../api/dto';
import { referrerOf, toAnalyticsEvent } from '../events';

describe('toAnalyticsEvent', () => {
  it('adds the request\'s user agent and referrer, and fills what was not sent with null', () => {
    const e = toAnalyticsEvent(eventRequestSchema.parse({ name: 'product_view', productId: 'mochi' }),
      { userAgent: 'UA', referrer: 'https://shop.test/cards/mochi?utm=x#top' }, null);
    expect(e).toEqual({ name: 'product_view', sessionId: null, giftCardId: null, orderId: null, productId: 'mochi', props: {},
      userAgent: 'UA', referrer: 'https://shop.test' });
  });

  it('cuts long values short', () => {
    const e = toAnalyticsEvent(eventRequestSchema.parse({ name: 'ar_start' }), { userAgent: 'x'.repeat(1000), referrer: null }, 'g1');
    expect(e.userAgent).toHaveLength(300);
    expect(e.giftCardId).toBe('g1');
  });
});

describe('referrerOf', () => {
  it('keeps only the origin (a path may be a private gift or order link), and ignores what is not a URL', () => {
    expect(referrerOf('https://zalo.me/share?token=abc')).toBe('https://zalo.me');
    expect(referrerOf('https://shop.test/g/Ab3dE5gH7j')).toBe('https://shop.test');
    expect(referrerOf('nonsense')).toBeNull();
    expect(referrerOf(null)).toBeNull();
  });
});
