import { describe, expect, it, vi } from 'vitest';
import { MemoryRepository } from '../../db/memory-repository';
import { PRODUCTS, PNG } from '../../orders/__tests__/test-kit';

const upload = vi.fn(async () => 'drafts/00000000-0000-4000-8000-000000000009.png');
const sign = vi.fn(async (p: string, s: number) => `https://signed/${p}?${s}`);
vi.mock('../../db', () => ({ getRepository: () => new MemoryRepository(PRODUCTS) }));
vi.mock('../../db/photos', () => ({ uploadDraftPhoto: upload, signedPhotoUrl: sign, photoExists: async () => true }));
vi.mock('../photo-clean', () => ({ cleanPhoto: async (bytes: Uint8Array, ext: string) => ({ bytes, ext }) }));   // its own test decodes real images
const cookieJar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (n: string) => (cookieJar.has(n) ? { value: cookieJar.get(n) } : undefined) }) }));

const { getServices } = await import('../services');
const { orderCookieName, orderCookieOptions, readOrderToken } = await import('../order-cookie');

describe('getServices', () => {
  it('makes the orders service once, on the configured repository', async () => {
    const a = getServices();
    expect(getServices()).toBe(a);
    expect((await a.orders.listProducts()).map(p => p.id)).toContain('flower-letter');
  });

  it('stores photos with the type their bytes say, and signs links', async () => {
    const r = await getServices().orders.uploadPhoto(PNG);
    expect(upload).toHaveBeenCalledWith(PNG, 'png', 'image/png');
    expect(r.previewUrl).toBe('https://signed/drafts/00000000-0000-4000-8000-000000000009.png?3600');
  });
});

describe('the order cookie', () => {
  it('is named for its order, httpOnly, same-site lax, for 30 days', () => {
    expect(orderCookieName('abc')).toBe('gc_o_abc');
    expect(orderCookieOptions()).toEqual({ httpOnly: true, sameSite: 'lax', path: '/', secure: false, maxAge: 2592000 });
  });

  it('is read from the request\'s cookies', async () => {
    cookieJar.set('gc_o_o1', 'token-1');
    expect(await readOrderToken('o1')).toBe('token-1');
    expect(await readOrderToken('o2')).toBeNull();
  });
});
