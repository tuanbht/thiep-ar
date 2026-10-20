import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { StateError } from '../../db/repository';
import { AccessDenied, InvalidInput, NotFound, TooLarge } from '../../orders/errors';
import { PaymentUnavailable } from '../../payments/provider';
import { errorResponse, issuesOf, originOf, readBody, readJson, route } from '../api';
import { resetServerEnv } from '../env';

const post = (body: BodyInit | null, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/api/x', { method: 'POST', body, headers: { origin: 'http://localhost:3000', ...headers }, duplex: 'half' } as RequestInit);

describe('errorResponse', () => {
  it.each([
    [new InvalidInput(['Tiêu đề chưa hợp lệ.']), 400, 'Tiêu đề chưa hợp lệ.'],
    [new AccessDenied(), 403, 'Đơn hàng này được tạo trên một trình duyệt khác.'],
    [new NotFound('Không tìm thấy đơn hàng.'), 404, 'Không tìm thấy đơn hàng.'],
    [new TooLarge('Ảnh tối đa 5 MB.'), 413, 'Ảnh tối đa 5 MB.']
  ])('answers %s with its status and message', async (e, status, error) => {
    const res = errorResponse(e, 'test');
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
  });

  it('hides the inside of a state clash, an outage and anything unexpected', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {}), err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(errorResponse(new StateError('order GC-1 is paid by zp_9'), 't').status).toBe(409);
    expect(errorResponse(new PaymentUnavailable('SEPAY_API_KEY is not set'), 't').status).toBe(503);
    const res = errorResponse(new Error('connect ECONNREFUSED 10.0.0.3:5432 password=hunter2'), 't');
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/ECONNREFUSED|hunter2/);
    expect(err).toHaveBeenCalled();
    warn.mockRestore(); err.mockRestore();
  });
});

describe('route', () => {
  it('runs the handler for a same-origin request', async () => {
    const res = await route(post(null, { 'x-forwarded-for': '9.9.9.1' }), { rate: { name: 't1', limit: 5, windowMs: 1000 }, sameOrigin: true },
      async () => new Response('ok'));
    expect(await res.text()).toBe('ok');
  });

  it('turns a thrown error into its answer', async () => {
    const res = await route(post(null, { 'x-forwarded-for': '9.9.9.2' }), { rate: { name: 't2', limit: 5, windowMs: 1000 } },
      async () => { throw new NotFound(); });
    expect(res.status).toBe(404);
  });
});

describe('reading bodies', () => {
  it('reads up to the cap and refuses past it, with or without a declared length', async () => {
    expect(await readBody(post('hello'), 5)).toEqual(new TextEncoder().encode('hello'));
    await expect(readBody(post('hello!'), 5)).rejects.toThrow(TooLarge);
    await expect(readBody(post('hi', { 'content-length': '999' }), 5)).rejects.toThrow(TooLarge);
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(4)); c.enqueue(new Uint8Array(4)); c.close(); } });
    await expect(readBody(post(stream), 5)).rejects.toThrow(TooLarge);
    expect(await readBody(post(null), 5)).toEqual(new Uint8Array());
  });

  it('parses JSON or says it could not', async () => {
    expect(await readJson(post('{"a":1}'))).toEqual({ a: 1 });
    await expect(readJson(post('{'))).rejects.toThrow(InvalidInput);
  });
});

describe('issuesOf', () => {
  it('names the fields to fix, once each', () => {
    const r = z.object({ content: z.object({ title: z.string().min(1), letter: z.object({ to: z.string().min(1), from: z.string().min(1) }) }), productId: z.string() })
      .safeParse({ content: { title: '', letter: { to: '', from: '' } }, productId: 1 });
    expect(issuesOf(r.error!)).toEqual(['Tiêu đề chưa hợp lệ.', 'Lời gọi chưa hợp lệ.', 'Lời ký tên chưa hợp lệ.', 'Mẫu thiệp chưa hợp lệ.']);
    expect(issuesOf({ issues: [{ path: ['mystery'] }] })).toEqual(['Một trường chưa hợp lệ.']);
  });
});

describe('originOf', () => {
  afterEach(() => { vi.unstubAllEnvs(); resetServerEnv(); });

  it('prefers the configured site address', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://thiep.example');
    resetServerEnv();
    expect(originOf(new Request('http://10.0.0.5:3000/x'))).toBe('https://thiep.example');
  });

  it("uses the request's own origin when no address is configured (development)", () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    resetServerEnv();
    expect(originOf(new Request('http://10.0.0.5:3000/x'))).toBe('http://10.0.0.5:3000');
  });
});
