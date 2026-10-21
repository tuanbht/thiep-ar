/* POST /callbacks/sepay/ipn: SePay's webhook for money arriving in the shop's bank account (set this URL in SePay >
   Webhooks). It only says "look": the order named in the transfer's message is checked against SePay's own API
   (OrdersService.notifyPayment) before anything is marked paid. SePay counts a delivery as done only for a 200 with
   exactly {"success": true}; anything else is retried, so a failure on our side answers 500. */
import { serverEnv } from "@/lib/server/env";
import { clientIp, RateLimiter } from "@/lib/server/security";
import { getServices } from "@/lib/server/services";
import {
  orderCodeOfWebhook,
  webhookAllowed,
  type SepayWebhook,
} from "@/lib/payments/sepay/webhook";

const MAX_BODY = 64 * 1024;
const limiter = new RateLimiter(300, 60_000);
const answer = (success: boolean, status = 200) =>
  Response.json(
    { success },
    { status, headers: { "Cache-Control": "no-store" } },
  );

export async function POST(req: Request) {
  const env = serverEnv();
  if (!limiter.check(`sepay:${clientIp(req, env.TRUSTED_IP_HEADER)}`).ok)
    return answer(false, 429);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return answer(false, 413);
  const keys = {
    secret: env.SEPAY_WEBHOOK_SECRET ?? env.SEPAY_SECRET_KEY,
    apiKey: env.SEPAY_WEBHOOK_API_KEY,
  };
  if (!webhookAllowed(req.headers, raw, keys)) {
    console.warn(
      "[sepay] a webhook without a valid signature or key was refused",
    );
    return answer(false, 401);
  }
  let body: SepayWebhook;
  try {
    body = JSON.parse(raw) as SepayWebhook;
  } catch {
    return answer(false, 400);
  }
  const code = orderCodeOfWebhook(body);
  if (!code) return answer(true); // money out, or a transfer that names no order of ours
  try {
    const status = await getServices().orders.notifyPayment(code);
    console.info(
      `[sepay] webhook ${body.id ?? "?"} for ${code}: ${status ?? "no such order"}`,
    );
    return answer(true);
  } catch (e) {
    console.error(`[sepay] webhook ${body.id ?? "?"} for ${code} failed`, e);
    return answer(false, 500);
  }
}
