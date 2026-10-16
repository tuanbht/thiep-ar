/* The server's Supabase client: the secret key, no user session. Never imported by the browser. */
import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type Db = SupabaseClient<Database>;

export class ConfigError extends Error {}

/** SUPABASE_URL and SUPABASE_SECRET_KEY from the environment; a ConfigError names whichever is missing. */
export function supabaseConfig(env: Record<string, string | undefined> = process.env): { url: string; key: string } {
  const url = env.SUPABASE_URL?.trim(), key = env.SUPABASE_SECRET_KEY?.trim();
  const missing = [!url && 'SUPABASE_URL', !key && 'SUPABASE_SECRET_KEY'].filter(Boolean);
  if (missing.length) throw new ConfigError(`Supabase is not configured: set ${missing.join(' and ')} (see .env.example).`);
  return { url: url!, key: key! };
}

export function createAdminClient(config = supabaseConfig()): Db {
  return createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-client-info': 'gift-cards-server' } }
  });
}

let shared: Db | null = null;

/** One client per server process. */
export function getAdminClient(): Db {
  shared ??= createAdminClient();
  return shared;
}
