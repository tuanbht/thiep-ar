// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* each test gets a fresh module (the page's one-time setup and last address live in it) */
const load = async () => {
  vi.resetModules();
  return import("../ga");
};
const layer = () =>
  ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? []).map(
    (a) => Array.from(a),
  );
const at = (path: string) => window.history.pushState({}, "", path);

beforeEach(() => {
  delete (window as unknown as { dataLayer?: unknown }).dataLayer;
  delete (window as unknown as { gtag?: unknown }).gtag;
  vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
  at("/");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the addresses Google Analytics may see", () => {
  it("replaces a gift's slug and an order's id, and keeps public pages as they are", async () => {
    const { redactPath } = await load();
    expect(redactPath("/g/Xk2pQ9rT")).toBe("/g/[slug]");
    expect(redactPath("/orders/3f2a1b4c-0d9e-4f6a-8b7c-1d2e3f4a5b6c")).toBe(
      "/orders/[orderId]",
    );
    expect(redactPath("/checkout/3f2a1b4c/pay")).toBe(
      "/checkout/[orderId]/pay",
    );
    expect(redactPath("/cards/birthday-mom")).toBe("/cards/birthday-mom");
    expect(redactPath("/")).toBe("/");
  });

  it("keeps the shelf's search and campaign tags, drops every other part of the query", async () => {
    const { redactUrl } = await load();
    const here = "https://thiep.example/";
    expect(
      redactUrl(
        "https://thiep.example/?q=sinh+nhat&c=birthday&utm_source=zalo&gclid=abc&token=s3cret#x",
        here,
      ),
    ).toBe(
      "https://thiep.example/?q=sinh+nhat&c=birthday&utm_source=zalo&gclid=abc",
    );
    expect(
      redactUrl("https://thiep.example/g/Xk2pQ9rT?utm_source=zalo", here),
    ).toBe("https://thiep.example/g/[slug]");
  });

  it("keeps only the origin of another site's address, and nothing of a broken one", async () => {
    const { redactUrl } = await load();
    const here = "https://thiep.example/";
    expect(redactUrl("https://chat.zalo.me/some/thread?id=42", here)).toBe(
      "https://chat.zalo.me",
    );
    expect(redactUrl("http://[broken", here)).toBe("");
  });
});

describe("the measurement id", () => {
  it("takes a G- id and refuses anything else", async () => {
    const { gaId } = await load();
    expect(gaId()).toBe("G-TEST123");
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-1<script>");
    expect(gaId()).toBe("");
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    expect(gaId()).toBe("");
  });
});

describe("sending to Google Analytics", () => {
  it("sends nothing at all without a measurement id", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    const { track, pageView } = await load();
    track("product_view", { product_id: "mochi" });
    pageView();
    expect(layer()).toEqual([]);
  });

  it("sets up once, then counts each address a visitor reaches, with its private parts cut out", async () => {
    const { pageView } = await load();
    document.title = "Chúc mừng sinh nhật Hanna · Thiệp";
    at("/g/Xk2pQ9rT?ref=abc");
    pageView();
    pageView(); // the same address again (a re-render): still one view
    at("/cards/birthday-mom");
    document.title = "Sinh nhật Mẹ · Thiệp";
    pageView();
    const calls = layer();
    expect(calls[0][0]).toBe("js");
    const config = calls.findIndex((c) => c[0] === "config");
    expect(calls[config]).toEqual([
      "config",
      "G-TEST123",
      expect.objectContaining({ send_page_view: false }),
    ]);
    // the cut address is set before the tag is configured, so gtag never starts from the whole one
    expect(calls.findIndex((c) => c[0] === "set")).toBeLessThan(config);
    expect(calls.filter((c) => c[0] === "config")).toHaveLength(1);
    const views = calls.filter((c) => c[0] === "event" && c[1] === "page_view");
    expect(views).toHaveLength(2);
    expect(views[0][2]).toMatchObject({
      page_location: "http://localhost:3000/g/[slug]",
      page_title: "Gift",
    });
    expect(views[1][2]).toMatchObject({
      page_location: "http://localhost:3000/cards/birthday-mom",
      page_referrer: "http://localhost:3000/g/[slug]",
      page_title: "Sinh nhật Mẹ · Thiệp",
    });
    expect(JSON.stringify(calls)).not.toContain("Xk2pQ9rT");
    expect(JSON.stringify(calls)).not.toContain("Hanna");
  });

  it("sends an event with the page it happened on, cut like a page view, and never throws", async () => {
    const { track } = await load();
    at("/orders/3f2a1b4c-0d9e-4f6a-8b7c-1d2e3f4a5b6c");
    track("order_paid", { product_id: "birthday-kid", value: 49000 });
    const event = layer().find(
      (c) => c[0] === "event" && c[1] === "order_paid",
    );
    expect(event?.[2]).toMatchObject({
      product_id: "birthday-kid",
      value: 49000,
      page_location: "http://localhost:3000/orders/[orderId]",
    });
    (window as unknown as { gtag: () => void }).gtag = () => {
      throw new Error("blocked");
    };
    expect(() => track("preview_open")).not.toThrow();
  });
});
