/* The Repository contract against Supabase. Runs when SUPABASE_URL and SUPABASE_SECRET_KEY are set (pnpm db:start,
   then .env.local); its rows carry this run's own ids and are deleted afterwards. */
import { afterAll, describe, expect, it } from 'vitest';
import type { OrderStatus } from '../../domain/types';
import { createAdminClient, supabaseConfig, ConfigError } from '../client';
import { repositoryContract, runId, testProducts } from './repository.contract';
import { SupabaseRepository } from '../supabase-repository';

const configured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;

describe('supabaseConfig', () => {
  it('names whatever is missing', () => {
    expect(() => supabaseConfig({})).toThrow(ConfigError);
    expect(() => supabaseConfig({})).toThrow('set SUPABASE_URL and SUPABASE_SECRET_KEY');
    expect(() => supabaseConfig({ SUPABASE_URL: 'http://x' })).toThrow('set SUPABASE_SECRET_KEY (');
    expect(supabaseConfig({ SUPABASE_URL: ' http://x ', SUPABASE_SECRET_KEY: 'k' })).toEqual({ url: 'http://x', key: 'k' });
  });
});

describe.skipIf(!configured)('Supabase', () => {
  const run = runId();
  const products = testProducts(run);
  const db = configured ? createAdminClient() : null!;
  const sessions = new Set<string>();   // the events this run recorded, to delete afterwards

  repositoryContract('SupabaseRepository', async () => {
    const { error } = await db.from('products').insert([products.first, products.second, products.hidden].map(p => ({
      id: p.id, template: p.template, design: p.design, name: p.name, blurb: p.blurb, kind: p.kind, price_vnd: p.priceVnd, active: p.active, sort: p.sort
    })));
    if (error) throw new Error(`could not add the test products: ${error.message}`);
    return {
      repo: new SupabaseRepository(db),
      products,
      async setOrderStatus(orderId: string, status: OrderStatus) {
        const { error: e } = await db.from('orders').update({ status }).eq('id', orderId);
        if (e) throw new Error(e.message);
      },
      async countEvents(sessionId: string) {
        sessions.add(sessionId);
        const { count, error: e } = await db.from('events').select('id', { count: 'exact', head: true }).eq('session_id', sessionId);
        if (e) throw new Error(e.message);
        return count ?? 0;
      }
    };
  });

  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  it.skipIf(!anon)('keeps the public roles out: a public key reads nothing', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const pub = createClient(process.env.SUPABASE_URL!, anon!, { auth: { persistSession: false } });
    const { data, error } = await pub.from('products').select('id').limit(1);
    expect(error ?? data?.length === 0).toBeTruthy();
  });

  afterAll(async () => {
    const ids = [products.first.id, products.second.id, products.hidden.id];
    const { data: orders } = await db.from('orders').select('id, gift_card_id').in('product_id', ids);
    const orderIds = (orders ?? []).map(o => o.id);
    if (sessions.size) await db.from('events').delete().in('session_id', [...sessions]);
    if (orderIds.length) {
      await db.from('events').delete().in('order_id', orderIds);
      await db.from('payments').delete().in('order_id', orderIds);
      await db.from('orders').delete().in('id', orderIds);
    }
    const { data: gifts } = await db.from('gift_cards').select('id').in('product_id', ids);
    const giftIds = (gifts ?? []).map(g => g.id);
    if (giftIds.length) {
      await db.from('events').delete().in('gift_card_id', giftIds);
      await db.from('gift_cards').delete().in('id', giftIds);
    }
    await db.from('products').delete().in('id', ids);
  });
});
