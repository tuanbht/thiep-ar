/* POST /api/events: what browsers report for the stats (a product seen, a preview opened, a gift found by the camera,
   a letter read). Checked, tied to its gift by the link's slug, kept with the user agent and referrer. 204. */
import type { NextRequest } from 'next/server';
import { eventRequestSchema } from '@/lib/api/dto';
import { toAnalyticsEvent } from '@/lib/analytics/events';
import { InvalidInput } from '@/lib/orders/errors';
import { issuesOf, readJson, route } from '@/lib/server/api';
import { getServices } from '@/lib/server/services';

export async function POST(req: NextRequest) {
  return route(req, { rate: { name: 'events', limit: 120, windowMs: 60_000 }, sameOrigin: true }, async () => {
    const parsed = eventRequestSchema.safeParse(await readJson(req, 8 * 1024));
    if (!parsed.success) throw new InvalidInput(issuesOf(parsed.error));
    const { orders } = getServices();
    const giftCardId = parsed.data.giftSlug ? await orders.giftIdBySlug(parsed.data.giftSlug) : null;
    await orders.recordEvent(toAnalyticsEvent(parsed.data, { userAgent: req.headers.get('user-agent'), referrer: req.headers.get('referer') }, giftCardId));
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  });
}
