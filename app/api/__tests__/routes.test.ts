/* The API routes as a browser meets them: real Request objects into the route handlers, the orders service on memory. */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  flowerOrder,
  JPEG,
  makeService,
} from "@/lib/orders/__tests__/test-kit";
import { LIMITS } from "@/lib/api/dto";
import type { OrdersService } from "@/lib/orders/service";

const kit = vi.hoisted(() => ({ orders: null as unknown as OrdersService }));
vi.mock("@/lib/server/services", () => ({
  getServices: () => ({ orders: kit.orders }),
}));

const { POST: createOrder } = await import("../orders/route");
const { GET: getOrder } = await import("../orders/[orderId]/route");
const { POST: pay } = await import("../orders/[orderId]/pay/route");
const { POST: upload } = await import("../uploads/route");

const SITE = "http://localhost:3000";
let ip = 0;
/** each test from its own address, so the rate limits do not carry over */
let me = "";
beforeEach(() => {
  me = `10.0.0.${++ip}`;
  kit.orders = makeService().orders;
});

function request(
  path: string,
  init: {
    method?: string;
    body?: BodyInit;
    json?: unknown;
    headers?: Record<string, string>;
    cookie?: string;
  } = {},
) {
  const headers: Record<string, string> = {
    origin: SITE,
    "x-forwarded-for": me,
    ...init.headers,
  };
  if (init.json !== undefined) headers["content-type"] = "application/json";
  if (init.cookie) headers.cookie = init.cookie;
  return new NextRequest(`${SITE}${path}`, {
    method: init.method ?? "POST",
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
}
const params = (orderId: string) => ({ params: Promise.resolve({ orderId }) });

async function placeOrder() {
  const res = await createOrder(
    request("/api/orders", { json: flowerOrder() }),
  );
  const body = (await res.json()) as {
    orderId: string;
    code: string;
    checkoutUrl: string;
  };
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0];
  return { res, body, setCookie, cookie };
}

describe("POST /api/orders", () => {
  it("creates the order and gives this browser its key in an httpOnly cookie", async () => {
    const { res, body, setCookie } = await placeOrder();
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(body.checkoutUrl).toBe(`/checkout/${body.orderId}`);
    expect(setCookie).toMatch(
      new RegExp(`^gc_o_${body.orderId}=[A-Za-z0-9_-]{43};`),
    );
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toMatch(/Max-Age=2592000/);
  });

  it("refuses bad input with the fields to fix, and never stores it", async () => {
    const res = await createOrder(
      request("/api/orders", {
        json: {
          productId: "flower-letter",
          content: { title: "", letter: { to: "", body: [], from: "" } },
        },
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Tiêu đề chưa hợp lệ.");
  });

  it("refuses a body that is not JSON, or too large", async () => {
    expect(
      (
        await createOrder(
          request("/api/orders", {
            body: "{ nope",
            headers: { "content-type": "application/json" },
          }),
        )
      ).status,
    ).toBe(400);
    const big = JSON.stringify({
      ...flowerOrder(),
      pad: "x".repeat(70 * 1024),
    });
    expect(
      (
        await createOrder(
          request("/api/orders", {
            body: big,
            headers: { "content-type": "application/json" },
          }),
        )
      ).status,
    ).toBe(413);
  });

  it("refuses another site posting on the buyer's behalf", async () => {
    const res = await createOrder(
      request("/api/orders", {
        json: flowerOrder(),
        headers: { origin: "https://evil.test" },
      }),
    );
    expect(res.status).toBe(403);
  });

  it("answers 404 for a card that is not for sale", async () => {
    expect(
      (
        await createOrder(
          request("/api/orders", {
            json: flowerOrder({ productId: "retired" }),
          }),
        )
      ).status,
    ).toBe(404);
  });

  it("slows down one address sending too many", async () => {
    for (let i = 0; i < 10; i++)
      await createOrder(
        request("/api/orders", { json: flowerOrder({ productId: "retired" }) }),
      );
    const res = await createOrder(
      request("/api/orders", { json: flowerOrder() }),
    );
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("GET /api/orders/:id and POST /api/orders/:id/pay", () => {
  it("shows the order to its browser only", async () => {
    const { body, cookie } = await placeOrder();
    const mine = await getOrder(
      request(`/api/orders/${body.orderId}`, { method: "GET", cookie }),
      params(body.orderId),
    );
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({
      id: body.orderId,
      status: "pending",
      giftUrl: null,
    });
    expect(
      (
        await getOrder(
          request(`/api/orders/${body.orderId}`, { method: "GET" }),
          params(body.orderId),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await getOrder(
          request("/api/orders/not-an-order", { method: "GET", cookie }),
          params("not-an-order"),
        )
      ).status,
    ).toBe(404);
  });

  it("pays (test provider) and then the order shows the gift's link", async () => {
    const { body, cookie } = await placeOrder();
    const p = await pay(
      request(`/api/orders/${body.orderId}/pay`, { cookie }),
      params(body.orderId),
    );
    expect(p.status).toBe(200);
    expect(await p.json()).toEqual({ redirect: `/orders/${body.orderId}` });
    const view = await (
      await getOrder(
        request(`/api/orders/${body.orderId}`, { method: "GET", cookie }),
        params(body.orderId),
      )
    ).json();
    expect(view.status).toBe("paid");
    expect(view.giftUrl).toMatch(
      /^http:\/\/localhost:3000\/g\/[0-9A-Za-z]{10}$/,
    );
  });

  it("refuses to pay from another browser or another site", async () => {
    const { body, cookie } = await placeOrder();
    expect(
      (
        await pay(
          request(`/api/orders/${body.orderId}/pay`),
          params(body.orderId),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await pay(
          request(`/api/orders/${body.orderId}/pay`, {
            cookie,
            headers: { origin: "https://evil.test" },
          }),
          params(body.orderId),
        )
      ).status,
    ).toBe(403);
  });
});

describe("POST /api/uploads", () => {
  const form = (blob: Blob) => {
    const f = new FormData();
    f.set("photo", blob, "me.jpg");
    return f;
  };

  it("keeps a photo and answers its path and a preview link", async () => {
    const res = await upload(
      request("/api/uploads", {
        body: form(new Blob([JPEG], { type: "image/jpeg" })),
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      photoPath: expect.stringMatching(/^drafts\/.+\.jpg$/),
      previewUrl: expect.stringContaining("expires=3600"),
    });
  });

  it("judges the file by its bytes, not its name or type", async () => {
    const res = await upload(
      request("/api/uploads", {
        body: form(new Blob(["<svg onload=alert(1)>"], { type: "image/jpeg" })),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
  });

  it("refuses a request without the photo, or that is not a form", async () => {
    const f = new FormData();
    f.set("other", "x");
    expect((await upload(request("/api/uploads", { body: f }))).status).toBe(
      400,
    );
    expect(
      (await upload(request("/api/uploads", { json: { photo: "x" } }))).status,
    ).toBe(400);
  });

  it("refuses a body past the cap while it is still arriving", async () => {
    const res = await upload(
      request("/api/uploads", {
        body: form(
          new Blob([JPEG, new Uint8Array(LIMITS.photoBytes + 64 * 1024 + 1)]),
        ),
      }),
    );
    expect(res.status).toBe(413);
  });

  it("refuses a photo over 5 MB that fits in the body cap", async () => {
    const res = await upload(
      request("/api/uploads", {
        body: form(new Blob([JPEG, new Uint8Array(LIMITS.photoBytes)])),
      }),
    );
    expect(res.status).toBe(413);
  });
});
