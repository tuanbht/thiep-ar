// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/domain/types";
import { AccessDenied, NotFound } from "@/lib/orders/errors";

const listProducts = vi.fn(),
  listCategories = vi.fn(),
  getOrderView = vi.fn();
vi.mock("@/lib/server/services", () => ({
  getServices: () => ({
    orders: { listProducts, listCategories, getOrderView },
  }),
}));
vi.mock("@/lib/server/order-cookie", () => ({
  readOrderToken: vi.fn().mockResolvedValue("token"),
}));
vi.mock("../origin", () => ({
  siteOrigin: vi.fn().mockResolvedValue("https://thiep.example"),
}));
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const { Shelf, ShelfSkeleton } = await import("../Shelf");
const { OrderGate } = await import("../OrderGate");

const p = (id: string, kind: Product["kind"], sort: number): Product => ({
  id,
  template: id,
  design: null,
  name: id.toUpperCase(),
  blurb: null,
  kind,
  priceVnd: 49000,
  active: true,
  sort,
  tags: [],
  categories: [],
});
const love = { id: "love", name: "Tình yêu", blurb: null, sort: 10, count: 2 };
const asked = (search: Record<string, string>) => ({
  searchParams: Promise.resolve(search),
});
const headings = () =>
  screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
beforeEach(() => listCategories.mockResolvedValue([love]));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Shelf", () => {
  it("groups the cards: 3D acts, then films, under the search", async () => {
    listProducts.mockResolvedValue([
      p("mochi", "3d", 1),
      p("rain", "film", 2),
      p("pip", "3d", 3),
    ]);
    render(await Shelf({}));
    expect(listProducts).toHaveBeenCalledWith({
      query: undefined,
      category: undefined,
    });
    expect(headings()).toEqual([
      "Màn diễn 3D2",
      "MOCHI",
      "PIP",
      "Phim trên thiệp1",
      "RAIN",
    ]);
    expect(screen.getByRole("searchbox", { name: "Tìm thiệp" })).toBeTruthy();
  });

  it("shows what a search found, best match first, in the category asked for", async () => {
    listProducts.mockResolvedValue([p("rain", "film", 2), p("mochi", "3d", 1)]);
    render(await Shelf(asked({ q: " mưa ", c: "love" })));
    expect(listProducts).toHaveBeenCalledWith({
      query: "mưa",
      category: "love",
    });
    expect(headings()).toEqual(["RAIN", "MOCHI"]); // as found, no groups
    expect(screen.getByRole("status").textContent).toBe(
      "2 thiệp cho “mưa” trong Tình yêu",
    );
  });

  it("says when nothing matches, and shows everything for a category that does not exist", async () => {
    listProducts.mockResolvedValue([]);
    render(await Shelf(asked({ q: "zzz" })));
    expect(screen.getByText("Chưa có tấm thiệp nào như vậy.")).toBeTruthy();
    cleanup();
    listProducts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([p("mochi", "3d", 1)]);
    render(await Shelf(asked({ c: "nope" })));
    expect(listProducts).toHaveBeenLastCalledWith({ query: undefined });
    expect(headings()).toEqual(["Màn diễn 3D1", "MOCHI"]);
  });

  it("says so when the shelf is empty or cannot be read", async () => {
    listProducts.mockResolvedValue([]);
    render(await Shelf({}));
    expect(screen.getByText(/Kệ đang trống/)).toBeTruthy();
    cleanup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    listProducts.mockRejectedValue(new Error("db down"));
    render(await Shelf({}));
    expect(screen.getByText(/Chưa mở được kệ thiệp/)).toBeTruthy();
    render(<ShelfSkeleton />);
  });
});

describe("OrderGate", () => {
  const view = {
    id: "o1",
    code: "GC-1",
    status: "pending",
    amountVnd: 1,
    product: { id: "m", name: "M", template: "m" },
    createdAt: "",
    paidAt: null,
    giftUrl: null,
  };

  it("shows the order to the browser that placed it", async () => {
    getOrderView.mockResolvedValue(view);
    render(
      await OrderGate({ orderId: "o1", children: (v) => <p>{v.code}</p> }),
    );
    expect(screen.getByText("GC-1")).toBeTruthy();
    expect(getOrderView).toHaveBeenCalledWith(
      "o1",
      "token",
      "https://thiep.example",
    );
  });

  it("tells another browser politely, and a missing order is not found", async () => {
    getOrderView.mockRejectedValueOnce(new AccessDenied("no"));
    render(await OrderGate({ orderId: "o1", children: () => null }));
    expect(screen.getByRole("heading").textContent).toMatch(/trình duyệt khác/);
    getOrderView.mockRejectedValueOnce(new NotFound("none"));
    await expect(
      OrderGate({ orderId: "o2", children: () => null }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    getOrderView.mockRejectedValueOnce(new Error("db down"));
    await expect(
      OrderGate({ orderId: "o3", children: () => null }),
    ).rejects.toThrow("db down");
  });
});
