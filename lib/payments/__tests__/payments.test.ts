import { describe, expect, it, vi } from 'vitest';
import { readEnv } from '../../server/env';
import type { Order, Product } from '../../domain/types';
import { paymentProviderFactory } from '..';
import { PaymentUnavailable, type PaymentProvider } from '../provider';
import { TestPaymentProvider } from '../test-provider';

const order = { id: 'o1', code: 'GC-261017-ABCDE', amountVnd: 49000 } as Order;
const product = { id: 'flower-letter' } as Product;
const confirmed = () => vi.fn(async () => ({}) as never);

describe('the test provider', () => {
  it('confirms the payment at once, for the order\'s own amount, and says it is done', async () => {
    const confirm = confirmed();
    const p: PaymentProvider = new TestPaymentProvider(confirm, () => new Date('2026-10-16T00:00:00Z'));
    expect(await p.start(order, product, { origin: 'http://localhost:3000' })).toEqual({ kind: 'completed' });
    expect(confirm).toHaveBeenCalledWith({ orderId: 'o1', provider: 'test', providerRef: 'test_GC-261017-ABCDE', amountVnd: 49000,
      raw: { simulated: true, product: 'flower-letter', code: 'GC-261017-ABCDE' }, paidAt: '2026-10-16T00:00:00.000Z' });
  });
});

describe('choosing the provider', () => {
  it('is the test provider in development', () => {
    expect(paymentProviderFactory(readEnv({}))(confirmed()).id).toBe('test');
  });

  it('refuses test payments in production unless allowed', () => {
    expect(() => paymentProviderFactory(readEnv({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://shop.test' }))(confirmed())).toThrow(PaymentUnavailable);
    expect(paymentProviderFactory(readEnv({ NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://shop.test', ALLOW_TEST_PAYMENTS: 'true' }))(confirmed()).id).toBe('test');
  });

  it('has no ZaloPay yet: the factory is made, paying with it is refused', () => {
    const make = paymentProviderFactory(readEnv({ PAYMENT_PROVIDER: 'zalopay' }));
    expect(() => make(confirmed())).toThrow('ZaloPay is not configured yet');
  });
});
