/* SePay's webhook (POST /callbacks/sepay/ipn): who may send it, and what it says. A webhook only tells the shop to look
   (OrdersService.notifyPayment re-reads the money from SePay's API), so a forged one can do nothing but trigger that
   look; still, when a secret is configured, an unsigned or badly signed request is refused.
     HMAC-SHA256 (recommended): X-SePay-Signature: sha256=<hex of HMAC(secret, "<X-SePay-Timestamp>.<raw body>")>,
       the timestamp within five minutes
     API key: Authorization: Apikey <key>
   Docs: https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { orderCodeIn } from "./code";

export interface WebhookKeys {
  /** the webhook's HMAC secret (SEPAY_SECRET_KEY) */
  secret?: string;
  /** the webhook's API key (SEPAY_WEBHOOK_API_KEY) */
  apiKey?: string;
}

const REPLAY_WINDOW_S = 300;

const same = (a: string, b: string): boolean => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Whether a webhook request carries what the configured keys ask for (anything goes when none is configured). */
export function webhookAllowed(
  headers: Headers,
  rawBody: string,
  keys: WebhookKeys,
  nowS = Math.floor(Date.now() / 1000),
): boolean {
  const signature = headers.get("x-sepay-signature");
  if (keys.secret && signature) {
    const ts = Number(headers.get("x-sepay-timestamp"));
    if (!Number.isInteger(ts) || Math.abs(nowS - ts) > REPLAY_WINDOW_S)
      return false;
    const expected = `sha256=${createHmac("sha256", keys.secret).update(`${ts}.${rawBody}`).digest("hex")}`;
    return same(expected, signature);
  }
  if (keys.apiKey) {
    const auth = headers.get("authorization") ?? "";
    return auth.startsWith("Apikey ") && same(auth.slice(7), keys.apiKey);
  }
  return !keys.secret; // a secret is configured but nothing was signed with it
}

export interface SepayWebhook {
  id?: number | string;
  transferType?: string;
  transferAmount?: number;
  code?: string | null;
  content?: string;
  description?: string;
}

/** The order a webhook is about: the order code in its payment code or message, for money coming in; else null. */
export function orderCodeOfWebhook(w: SepayWebhook): string | null {
  if (w.transferType !== "in") return null;
  return orderCodeIn(
    `${w.code ?? ""} ${w.content ?? ""} ${w.description ?? ""}`,
  );
}
