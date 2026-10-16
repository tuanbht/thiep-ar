/* POST /api/orders/:id/pay: start paying. Answers where to send the buyer: back to the order (paid at once by the test
   provider) or to the payment gateway. Pressing it again after paying just leads back to the order. */
import type { NextRequest } from 'next/server';
import { json, originOf, route } from '@/lib/server/api';
import { orderCookieName } from '@/lib/server/order-cookie';
import { getServices } from '@/lib/server/services';

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  return route(req, { rate: { name: 'pay', limit: 10, windowMs: 60_000 }, sameOrigin: true }, async () => {
    const { orderId } = await ctx.params;
    const token = req.cookies.get(orderCookieName(orderId))?.value ?? null;
    return json(await getServices().orders.startPayment(orderId, token, originOf(req)));
  });
}
