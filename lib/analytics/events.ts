/* An event a browser reports (POST /api/events), as the row the platform keeps: the request's own user agent and
   referrer added, the referrer cut to its origin (its path may be a gift's or an order's private link), long values
   cut short. */
import type { z } from "zod";
import type { eventRequestSchema } from "../api/dto";
import type { AnalyticsEvent } from "../domain/types";

export type ParsedEventRequest = z.output<typeof eventRequestSchema>;

export interface RequestMeta {
  userAgent: string | null;
  referrer: string | null;
}

const cut = (s: string | null, n: number) => (s ? s.slice(0, n) : null);

export function referrerOf(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return cut(new URL(raw).origin, 300);
  } catch {
    return null;
  }
}

export function toAnalyticsEvent(
  e: ParsedEventRequest,
  meta: RequestMeta,
  giftCardId: string | null,
): AnalyticsEvent {
  return {
    name: e.name,
    sessionId: e.sessionId ?? null,
    giftCardId,
    orderId: null,
    productId: e.productId ?? null,
    props: e.props ?? {},
    userAgent: cut(meta.userAgent, 300),
    referrer: referrerOf(meta.referrer),
  };
}
