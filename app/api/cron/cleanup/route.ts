/* GET /api/cron/cleanup: the nightly sweep of abandoned purchases (lib/db/cleanup.ts). Only a scheduler holding
   CRON_SECRET may run it (Vercel Cron sends it as a bearer token); without the secret configured it answers 503. */
import { cleanupAbandoned } from '@/lib/db/cleanup';
import { serverEnv } from '@/lib/server/env';
import { errorResponse, json, jsonError } from '@/lib/server/api';
import { safeEqualHex, sha256Hex } from '@/lib/server/security';

export async function GET(req: Request) {
  let secret: string | undefined;
  try { secret = serverEnv().CRON_SECRET; } catch { secret = undefined; }
  if (!secret) return jsonError(503, 'cleanup is not configured');
  const sent = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1] ?? '';
  if (!safeEqualHex(sha256Hex(sent), sha256Hex(secret))) return jsonError(401, 'unauthorized');
  try {
    return json(await cleanupAbandoned());
  } catch (e) {
    return errorResponse(e, 'GET /api/cron/cleanup');
  }
}
