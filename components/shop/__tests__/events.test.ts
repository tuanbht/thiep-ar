// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionId, track } from '../events';

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear(); });

describe('counting what visitors do', () => {
  it('keeps one session id per tab', () => {
    const a = sessionId();
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    expect(sessionId()).toBe(a);
  });

  it('posts the event with the session id, and never throws', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    track({ name: 'product_view', productId: 'mochi' });
    expect(fetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({ method: 'POST', keepalive: true }));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ name: 'product_view', productId: 'mochi', sessionId: sessionId() });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(() => track({ name: 'preview_open' })).not.toThrow();
    vi.stubGlobal('fetch', () => { throw new Error('no fetch'); });
    expect(() => track({ name: 'preview_open' })).not.toThrow();
  });

  it('still names a session when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(sessionId()).toBe('no-storage');
    vi.restoreAllMocks();
  });
});
