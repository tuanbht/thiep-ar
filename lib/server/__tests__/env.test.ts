import { describe, expect, it } from 'vitest';
import { EnvError, readEnv, testPaymentsAllowed } from '../env';

describe('readEnv', () => {
  it('defaults to development with test payments', () => {
    expect(readEnv({})).toEqual({ NODE_ENV: 'development', PAYMENT_PROVIDER: 'test', ALLOW_TEST_PAYMENTS: false,
      SEPAY_API_URL: 'https://userapi.sepay.vn/v2', SEPAY_QR_TEMPLATE: 'compact' });
  });

  it('reads the Supabase keys and the site address, and treats blanks as unset', () => {
    expect(readEnv({ SUPABASE_URL: 'http://127.0.0.1:54421', SUPABASE_SECRET_KEY: 'sb_secret_x', NEXT_PUBLIC_SITE_URL: ' ', ALLOW_TEST_PAYMENTS: 'true' }))
      .toMatchObject({ SUPABASE_URL: 'http://127.0.0.1:54421', SUPABASE_SECRET_KEY: 'sb_secret_x', NEXT_PUBLIC_SITE_URL: undefined, ALLOW_TEST_PAYMENTS: true });
  });

  it('names the bad keys, never their values', () => {
    expect(() => readEnv({ PAYMENT_PROVIDER: 'paypal', SUPABASE_URL: 'secret-but-not-a-url' })).toThrow(EnvError);
    try { readEnv({ PAYMENT_PROVIDER: 'paypal', SUPABASE_URL: 'secret-but-not-a-url' }); } catch (e) {
      expect((e as Error).message).toBe('bad settings: SUPABASE_URL, PAYMENT_PROVIDER');
    }
  });
});

describe('testPaymentsAllowed', () => {
  it('in development and tests, and in production only when allowed', () => {
    expect(testPaymentsAllowed(readEnv({}))).toBe(true);
    expect(testPaymentsAllowed(readEnv({ NODE_ENV: 'test' }))).toBe(true);
    const prod = { NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'https://thiep.vn' };
    expect(testPaymentsAllowed(readEnv(prod))).toBe(false);
    expect(testPaymentsAllowed(readEnv({ ...prod, ALLOW_TEST_PAYMENTS: 'true' }))).toBe(true);
  });

  it('needs the site address in production (links and QR codes never come from request headers there)', () => {
    expect(() => readEnv({ NODE_ENV: 'production' })).toThrow('NEXT_PUBLIC_SITE_URL');
  });
});
