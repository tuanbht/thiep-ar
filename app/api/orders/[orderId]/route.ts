/* GET /api/orders/:id: the order as its buyer sees it (status, and the gift's link once paid). The order page polls it
   while a payment is on its way. Only the browser holding the order's cookie may read it. */
import type { NextRequest } from "next/server";
import { json, originOf, route } from "@/lib/server/api";
import { orderCookieName } from "@/lib/server/order-cookie";
import { getServices } from "@/lib/server/services";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
) {
  return route(
    req,
    { rate: { name: "order-view", limit: 120, windowMs: 60_000 } },
    async () => {
      const { orderId } = await ctx.params;
      const token = req.cookies.get(orderCookieName(orderId))?.value ?? null;
      return json(
        await getServices().orders.getOrderView(orderId, token, originOf(req)),
      );
    },
  );
}
