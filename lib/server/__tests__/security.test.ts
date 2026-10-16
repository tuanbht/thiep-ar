import { describe, expect, it } from 'vitest';
import { clientIp, isSameOrigin, RateLimiter, randomToken, safeEqualHex, sha256Hex } from '../security';

const req = (headers: Record<string, string>, url = 'http://shop.test/api/orders') => new Request(url, { method: 'POST', headers });

describe('isSameOrigin', () => {
  it('lets this site\'s own pages through', () => {
    expect(isSameOrigin(req({ origin: 'http://shop.test' }))).toBe(true);
  });

  it('refuses another site', () => {
    expect(isSameOrigin(req({ origin: 'https://evil.test' }))).toBe(false);
    expect(isSameOrigin(req({ origin: 'http://shop.test.evil.test' }))).toBe(false);
    expect(isSameOrigin(req({ origin: 'not a url' }))).toBe(false);
  });

  it('accepts the configured site address (behind a proxy), comparing scheme, host and port', () => {
    expect(isSameOrigin(req({ origin: 'https://thiep.vn' }, 'http://10.0.0.5:3000/api/orders'), 'https://thiep.vn')).toBe(true);
    expect(isSameOrigin(req({ origin: 'http://thiep.vn' }, 'http://10.0.0.5:3000/api/orders'), 'https://thiep.vn', true)).toBe(false);
    expect(isSameOrigin(req({ origin: 'https://thiep.vn:8443' }, 'http://10.0.0.5:3000/api/orders'), 'https://thiep.vn', true)).toBe(false);
  });

  it("outside production also accepts the request's own origin (a dev server on any port), in production only the address", () => {
    expect(isSameOrigin(req({ origin: 'http://10.0.0.5:3000' }, 'http://10.0.0.5:3000/api/orders'), 'https://thiep.vn')).toBe(true);
    expect(isSameOrigin(req({ origin: 'http://10.0.0.5:3000' }, 'http://10.0.0.5:3000/api/orders'), 'https://thiep.vn', true)).toBe(false);
    expect(isSameOrigin(req({ origin: 'https://thiep.vn', host: 'thiep.vn' }, 'https://thiep.vn/api/orders'))).toBe(true);
  });

  it('without an Origin, trusts only the browser\'s own same-origin mark', () => {
    expect(isSameOrigin(req({}))).toBe(false);
    expect(isSameOrigin(req({ origin: 'null' }))).toBe(false);
    expect(isSameOrigin(req({ 'sec-fetch-site': 'same-origin' }))).toBe(true);
    expect(isSameOrigin(req({ 'sec-fetch-site': 'cross-site' }))).toBe(false);
  });
});

describe('clientIp', () => {
  it('takes the platform header when one is trusted, else the last hop of X-Forwarded-For (the proxy\'s), then X-Real-IP', () => {
    expect(clientIp(req({ 'x-forwarded-for': ' 1.2.3.4 , 10.0.0.1' }))).toBe('10.0.0.1');   // the first hop is the client's to forge
    expect(clientIp(req({ 'x-forwarded-for': '1.2.3.4', 'x-vercel-forwarded-for': '9.9.9.9' }), 'x-vercel-forwarded-for')).toBe('9.9.9.9');
    expect(clientIp(req({ 'x-forwarded-for': '1.2.3.4' }), 'x-vercel-forwarded-for')).toBe('1.2.3.4');
    expect(clientIp(req({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(clientIp(req({}))).toBe('unknown');
  });
});

describe('RateLimiter', () => {
  it('allows `limit` requests in the window, then says when to come back', () => {
    const l = new RateLimiter(3, 60_000);
    expect([0, 1000, 2000].map(t => l.check('a', t).ok)).toEqual([true, true, true]);
    expect(l.check('a', 3000)).toEqual({ ok: false, retryAfterSec: 57 });
    expect(l.check('b', 3000).ok).toBe(true);                 // another address has its own window
  });

  it('slides: the oldest request leaving the window makes room', () => {
    const l = new RateLimiter(2, 10_000);
    l.check('a', 0); l.check('a', 5000);
    expect(l.check('a', 9999).ok).toBe(false);
    expect(l.check('a', 10_001).ok).toBe(true);
  });

  it('forgets the least recently seen address past its size', () => {
    const l = new RateLimiter(1, 60_000, 2);
    l.check('a', 0); l.check('b', 0); l.check('c', 0);       // 'a' is pushed out
    expect(l.check('a', 1).ok).toBe(true);
    expect(l.check('c', 1).ok).toBe(false);
  });
});

describe('tokens', () => {
  it('are long, url-safe and different every time', () => {
    const a = randomToken(), b = randomToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it('hash and compare in constant time', () => {
    const h = sha256Hex('secret');
    expect(h).toBe('2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b');
    expect(safeEqualHex(h, sha256Hex('secret'))).toBe(true);
    expect(safeEqualHex(h, sha256Hex('secreT'))).toBe(false);
    expect(safeEqualHex(h, h.slice(2))).toBe(false);
    expect(safeEqualHex('zz', 'zz')).toBe(false);
  });
});
