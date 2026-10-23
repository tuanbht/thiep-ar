import { afterEach, describe, expect, it, vi } from "vitest";

const listProducts = vi.fn();
vi.mock("@/lib/server/services", () => ({
  getServices: () => ({ orders: { listProducts } }),
}));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost:3001" }),
}));

const { default: sitemap } = await import("../sitemap");

const product = (id: string, template = id) => ({
  id,
  template,
  design: null,
  name: id,
  blurb: null,
  kind: "3d",
  priceVnd: 49000,
  active: true,
  sort: 10,
  tags: [],
  categories: [],
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  listProducts.mockReset();
});

describe("sitemap.xml", () => {
  it("lists the shelf, the about page and every card on sale, at the site's own address", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thiep.example.vn/");
    listProducts.mockResolvedValue([
      product("drive-in"),
      product("birthday-mom"),
    ]);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual([
      "https://thiep.example.vn/",
      "https://thiep.example.vn/about",
      "https://thiep.example.vn/cards/drive-in",
      "https://thiep.example.vn/cards/birthday-mom",
    ]);
  });

  it("gives each card its shop picture, for image search", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thiep.example.vn");
    listProducts.mockResolvedValue([product("sitcom-pink", "our-sitcom")]);
    const card = (await sitemap()).find((e) =>
      e.url.endsWith("/cards/sitcom-pink"),
    );
    expect(card?.images).toEqual([
      "https://thiep.example.vn/thumbs/our-sitcom.jpg",
    ]);
  });

  it("never lists a gift, an order, a checkout, the API or the dev pages", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thiep.example.vn");
    listProducts.mockResolvedValue([product("mochi")]);
    const urls = (await sitemap()).map((e) => new URL(e.url).pathname);
    for (const path of urls)
      expect(path).not.toMatch(/^\/(g|orders|checkout|api|dev)(\/|$)/);
  });

  it("still lists the shelf and the about page when the cards cannot be read, and says why", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://thiep.example.vn");
    listProducts.mockRejectedValue(new Error("db down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual([
      "https://thiep.example.vn/",
      "https://thiep.example.vn/about",
    ]);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("sitemap"),
      expect.any(Error),
    );
  });

  it("uses the address it was asked on when the site's own is not set (development)", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    listProducts.mockResolvedValue([]);
    expect((await sitemap())[0].url).toBe("http://localhost:3001/");
  });
});
