/* POST /api/orders: the buyer's card becomes a draft gift and a pending order. Answers where to pay, and gives this
   browser the order's key (an httpOnly cookie). */
import { NextResponse, type NextRequest } from "next/server";
import { createOrderRequestSchema } from "@/lib/api/dto";
import { InvalidInput } from "@/lib/orders/errors";
import { issuesOf, readJson, route } from "@/lib/server/api";
import { orderCookieName, orderCookieOptions } from "@/lib/server/order-cookie";
import { getServices } from "@/lib/server/services";

export async function POST(req: NextRequest) {
  return route(
    req,
    { rate: { name: "orders", limit: 10, windowMs: 60_000 }, sameOrigin: true },
    async () => {
      const parsed = createOrderRequestSchema.safeParse(await readJson(req));
      if (!parsed.success) throw new InvalidInput(issuesOf(parsed.error));
      const { response, accessToken } = await getServices().orders.createOrder(
        parsed.data,
      );
      const res = NextResponse.json(response, {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      });
      res.cookies.set(
        orderCookieName(response.orderId),
        accessToken,
        orderCookieOptions(),
      );
      return res;
    },
  );
}
