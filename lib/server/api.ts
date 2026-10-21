/* The frame every API route runs in: the rate limit, the same-origin check, a capped body, and errors turned into
   `{ error }` answers that tell the buyer what to do without showing the server's insides. */
import "server-only";
import { NextResponse } from "next/server";
import { PaymentUnavailable } from "../payments/provider";
import { StateError } from "../db/repository";
import {
  AccessDenied,
  InvalidInput,
  NotFound,
  TooLarge,
} from "../orders/errors";
import { clientIp, isSameOrigin, RateLimiter } from "./security";
import { serverEnv } from "./env";

const NO_STORE = { "Cache-Control": "no-store" };

export const jsonError = (
  status: number,
  error: string,
  headers: Record<string, string> = {},
) =>
  NextResponse.json(
    { error },
    { status, headers: { ...NO_STORE, ...headers } },
  );

export const json = <T>(body: T, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE });

const limiters = new Map<string, RateLimiter>();
function limiter(name: string, limit: number, windowMs: number): RateLimiter {
  const key = `${name}:${limit}:${windowMs}`;
  let l = limiters.get(key);
  if (!l) {
    l = new RateLimiter(limit, windowMs);
    limiters.set(key, l);
  }
  return l;
}

export interface RouteOptions {
  /** the limit's name and size: `limit` requests per `windowMs` per address */
  rate: { name: string; limit: number; windowMs: number };
  /** state-changing routes: refuse requests from other sites */
  sameOrigin?: boolean;
}

/** Runs `handler` inside the checks; any error becomes a safe answer (unexpected ones are logged and hidden). */
export async function route(
  req: Request,
  o: RouteOptions,
  handler: () => Promise<Response>,
): Promise<Response> {
  const env = safeEnv();
  const r = limiter(o.rate.name, o.rate.limit, o.rate.windowMs).check(
    `${o.rate.name}:${clientIp(req, env?.TRUSTED_IP_HEADER)}`,
  );
  if (!r.ok)
    return jsonError(
      429,
      "Bạn thao tác hơi nhanh. Vui lòng thử lại sau ít phút.",
      { "Retry-After": String(r.retryAfterSec) },
    );
  if (
    o.sameOrigin &&
    !isSameOrigin(
      req,
      env?.NEXT_PUBLIC_SITE_URL,
      env?.NODE_ENV === "production",
    )
  )
    return jsonError(403, "Yêu cầu không đến từ trang này.");
  try {
    return await handler();
  } catch (e) {
    return errorResponse(e, `${req.method} ${safePath(req)}`);
  }
}

export function errorResponse(e: unknown, where: string): Response {
  if (e instanceof InvalidInput) return jsonError(400, e.message);
  if (e instanceof AccessDenied) return jsonError(403, e.message);
  if (e instanceof NotFound) return jsonError(404, e.message);
  if (e instanceof StateError) {
    console.warn(`[api] ${where}: ${e.message}`);
    return jsonError(
      409,
      "Đơn hàng không còn ở trạng thái cho phép thao tác này.",
    );
  }
  if (e instanceof TooLarge) return jsonError(413, e.message || "Tệp quá lớn.");
  if (e instanceof PaymentUnavailable) {
    console.warn(`[api] ${where}: ${e.message}`);
    return jsonError(503, "Thanh toán đang tạm ngưng. Vui lòng thử lại sau.");
  }
  console.error(`[api] ${where} failed`, e);
  return jsonError(500, "Có lỗi xảy ra. Vui lòng thử lại.");
}

function safeEnv() {
  try {
    return serverEnv();
  } catch {
    return null;
  }
}

function siteUrl(): string | undefined {
  return safeEnv()?.NEXT_PUBLIC_SITE_URL;
}

const safePath = (req: Request) => {
  try {
    return new URL(req.url).pathname;
  } catch {
    return "?";
  }
};

/** This site's origin as the browser sees it: the configured address, else the request's own. */
export function originOf(req: Request): string {
  const configured = siteUrl();
  if (configured) return new URL(configured).origin;
  return new URL(req.url).origin;
}

/** The body, at most `max` bytes (TooLarge past it, counted as it arrives, so a body without a length is capped too). */
export async function readBody(
  req: Request,
  max: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const declared = Number(req.headers.get("content-length"));
  if (declared > max) throw new TooLarge("Tệp quá lớn.");
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader(),
    parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new TooLarge("Tệp quá lớn.");
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

/** A JSON body of at most `max` bytes; InvalidInput if it is not JSON. */
export async function readJson(
  req: Request,
  max = 64 * 1024,
): Promise<unknown> {
  const bytes = await readBody(req, max);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new InvalidInput(["Dữ liệu gửi lên không đọc được."]);
  }
}

/** zod's issues as short lines a buyer can act on. */
export function issuesOf(error: {
  issues: { path: PropertyKey[] }[];
}): string[] {
  const lines = error.issues.slice(0, 5).map((i) => {
    const p = (i.path[0] === "content" ? i.path.slice(1) : i.path).map(String);
    const key = p[0] === "letter" ? `letter.${p[1] ?? ""}` : (p[0] ?? "");
    return `${FIELD[key] ?? "Một trường"} chưa hợp lệ.`;
  });
  return [...new Set(lines)];
}

const FIELD: Record<string, string> = {
  title: "Tiêu đề",
  intro: "Lời mở đầu",
  "letter.to": "Lời gọi",
  "letter.body": "Nội dung thư",
  "letter.from": "Lời ký tên",
  slots: "Chữ trên thiệp",
  photoPaths: "Ảnh",
  photoPath: "Ảnh",
  productId: "Mẫu thiệp",
  buyer: "Thông tin người mua",
  name: "Loại sự kiện",
};
