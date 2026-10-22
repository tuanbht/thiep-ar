// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sent = () =>
  ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
    .map((a) => Array.from(a))
    .filter((c) => c[0] === "event");

const load = async () => {
  vi.resetModules();
  return import("../events");
};

beforeEach(() => {
  delete (window as unknown as { dataLayer?: unknown }).dataLayer;
  delete (window as unknown as { gtag?: unknown }).gtag;
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("counting what visitors do", () => {
  it("sends the event to Google Analytics with its product", async () => {
    const { track } = await load();
    track({
      name: "chapter_reached",
      productId: "mochi",
      props: { chapter: 1 },
    });
    expect(sent()).toEqual([
      [
        "event",
        "chapter_reached",
        expect.objectContaining({ product_id: "mochi", chapter: 1 }),
      ],
    ]);
  });

  it("leaves the product out when there is none", async () => {
    const { track } = await load();
    track({ name: "photo_uploaded" });
    expect(sent()[0][2]).not.toHaveProperty("product_id");
  });

  it("counts a once-only event once in this browser, even when storage is blocked", async () => {
    const { trackOnce } = await load();
    trackOnce("paid:o1", { name: "order_paid", productId: "mochi" });
    trackOnce("paid:o1", { name: "order_paid", productId: "mochi" });
    expect(sent()).toHaveLength(1);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() =>
      trackOnce("paid:o2", { name: "order_paid", productId: "mochi" }),
    ).not.toThrow();
    expect(sent()).toHaveLength(2);
  });

  it("marks nothing as counted without Google Analytics, so turning it on later still counts", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    const { trackOnce } = await load();
    trackOnce("paid:o3", { name: "order_paid" });
    expect(localStorage.length).toBe(0);
  });
});
