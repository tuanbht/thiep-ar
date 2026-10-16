/* The server's settings, read once from the environment and checked. Empty values count as unset. Nothing here reaches
   the browser except NEXT_PUBLIC_SITE_URL, which Next inlines on its own. */
import 'server-only';
import { z } from 'zod';

const blankIsUnset = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const envSchema = z.object({
  NODE_ENV: z.preprocess(blankIsUnset, z.enum(['development', 'production', 'test']).default('development')),
  SUPABASE_URL: z.preprocess(blankIsUnset, z.string().url().optional()),
  SUPABASE_SECRET_KEY: z.preprocess(blankIsUnset, z.string().min(1).optional()),
  NEXT_PUBLIC_SITE_URL: z.preprocess(blankIsUnset, z.string().url().optional()),
  PAYMENT_PROVIDER: z.preprocess(blankIsUnset, z.enum(['test', 'zalopay']).default('test')),
  ALLOW_TEST_PAYMENTS: z.preprocess(blankIsUnset, z.enum(['true', 'false']).default('false')).transform(v => v === 'true'),
  /** a header only the hosting platform sets with the caller's address (e.g. x-vercel-forwarded-for) */
  TRUSTED_IP_HEADER: z.preprocess(blankIsUnset, z.string().regex(/^[a-z0-9-]+$/i).optional()),
  /** the bearer token the scheduled cleanup (GET /api/cron/cleanup) must bring */
  CRON_SECRET: z.preprocess(blankIsUnset, z.string().min(32).optional())
}).superRefine((env, ctx) => {
  // in production every link, QR code and origin check uses this address, never the request's (forgeable) headers
  if (env.NODE_ENV === 'production' && !env.NEXT_PUBLIC_SITE_URL) ctx.addIssue({ code: 'custom', path: ['NEXT_PUBLIC_SITE_URL'], message: 'required in production' });
});

export type ServerEnv = z.output<typeof envSchema>;

export class EnvError extends Error {}

/** The settings in `source`; EnvError naming every bad key (never their values). */
export function readEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const r = envSchema.safeParse(source);
  if (!r.success) throw new EnvError(`bad settings: ${r.error.issues.map(i => i.path.join('.')).join(', ')}`);
  return r.data;
}

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  cached ??= readEnv();
  return cached;
}

/** Forget the settings read so far (tests that change the environment). */
export function resetServerEnv(): void {
  cached = null;
}

/** Test payments pay at once: development and tests always, production only when ALLOW_TEST_PAYMENTS=true. */
export const testPaymentsAllowed = (env: ServerEnv): boolean => env.NODE_ENV !== 'production' || env.ALLOW_TEST_PAYMENTS;
