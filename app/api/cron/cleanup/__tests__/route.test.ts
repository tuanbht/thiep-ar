import { afterEach, describe, expect, it, vi } from "vitest";
import { resetServerEnv } from "@/lib/server/env";

const cleanupAbandoned = vi.fn(async () => ({
  orders: 2,
  giftCards: 2,
  photos: 3,
}));
vi.mock("@/lib/db/cleanup", () => ({ cleanupAbandoned }));
const { GET } = await import("../route");

const SECRET = "s".repeat(40);
const call = (auth?: string) =>
  GET(
    new Request("http://shop.test/api/cron/cleanup", {
      headers: auth ? { authorization: auth } : {},
    }),
  );

describe("GET /api/cron/cleanup", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetServerEnv();
    cleanupAbandoned.mockClear();
  });

  it("runs the sweep for the scheduler that holds the secret", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    resetServerEnv();
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orders: 2, giftCards: 2, photos: 3 });
  });

  it("refuses anyone else, without running anything", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    resetServerEnv();
    for (const auth of [undefined, "Bearer nope", `Basic ${SECRET}`])
      expect((await call(auth)).status).toBe(401);
    expect(cleanupAbandoned).not.toHaveBeenCalled();
  });

  it("is off until a secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    resetServerEnv();
    expect((await call(`Bearer ${SECRET}`)).status).toBe(503);
    expect(cleanupAbandoned).not.toHaveBeenCalled();
  });
});
