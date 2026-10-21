// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getGift = vi.fn(),
  recordEvent = vi.fn();
const later: Array<() => Promise<void>> = [];
vi.mock("@/lib/server/services", () => ({
  getServices: () => ({ orders: { getGift, recordEvent } }),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "user-agent": "phone", referer: "zalo" }),
}));
vi.mock("next/server", () => ({
  after: (fn: () => Promise<void>) => {
    later.push(fn);
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
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
vi.mock("@/components/shop/GiftClient", () => ({
  GiftClient: ({ slug, card }: { slug: string; card: { title: string } }) => (
    <p data-testid="gift">
      {slug}:{card.title}
    </p>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  later.length = 0;
});

const params = (slug: string) =>
  ({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve({}),
  }) as PageProps<"/g/[slug]">;

describe("the gift page", () => {
  it("plays an active gift and counts its opening after the response", async () => {
    const { default: GiftPage, generateMetadata } =
      await import("../g/[slug]/page");
    getGift.mockResolvedValue({
      giftCard: { id: "g1" },
      product: { id: "mochi" },
      card: { title: "Gửi Hanna" },
    });
    render(await GiftPage(params("AbC123xyz0")));
    expect(screen.getByTestId("gift").textContent).toBe("AbC123xyz0:Gửi Hanna");
    await Promise.all(later.map((f) => f()));
    expect(recordEvent).toHaveBeenCalledWith({
      name: "gift_open",
      giftCardId: "g1",
      productId: "mochi",
      userAgent: "phone",
      referrer: "zalo",
    });
    expect(await generateMetadata(params("AbC123xyz0"))).toMatchObject({
      title: "Gửi Hanna",
      robots: { index: false },
    });
  });

  it("previews a shared gift link by its card: the template's picture and the card's title, never the letter", async () => {
    const { generateMetadata } = await import("../g/[slug]/page");
    getGift.mockResolvedValue({
      giftCard: { id: "g1" },
      product: { id: "starry-date", name: "Hẹn hò dưới sao" },
      card: {
        title: "Gửi Hanna",
        template: "starry-date",
        letter: { to: "Hanna à,", body: ["Bí mật của hai đứa"], from: "Anh" },
        photos: ["https://storage.example/private/1.jpg"],
      },
    });
    const meta = await generateMetadata(params("AbC123xyz0"));
    const image = {
      url: "/thumbs/starry-date.jpg",
      width: 960,
      height: 600,
      alt: "Hẹn hò dưới sao",
    };
    expect(meta.openGraph).toMatchObject({
      title: "Gửi Hanna",
      images: [image],
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      images: [image],
    });
    expect(JSON.stringify(meta)).not.toMatch(/Bí mật|storage\.example/); // the letter and the photos stay inside
  });

  it("gives a link that opens no gift no card's picture", async () => {
    const { generateMetadata } = await import("../g/[slug]/page");
    getGift.mockResolvedValue(null);
    const meta = await generateMetadata(params("AbC123xyz0"));
    expect(meta.openGraph).toBeUndefined();
    expect(meta.robots).toMatchObject({ index: false });
  });

  it("is not found for a malformed slug or a gift that is not paid, and a failed count is only logged", async () => {
    const { default: GiftPage } = await import("../g/[slug]/page");
    await expect(GiftPage(params("../etc"))).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getGift).not.toHaveBeenCalled();
    getGift.mockResolvedValue(null);
    await expect(GiftPage(params("Nope000000"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    getGift.mockResolvedValue({
      giftCard: { id: "g1" },
      product: { id: "mochi" },
      card: { title: "x" },
    });
    recordEvent.mockRejectedValue(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await GiftPage(params("AbC123xyz1"));
    await Promise.all(later.map((f) => f()));
    expect(err).toHaveBeenCalled();
  });
});

describe("the pages for when things go wrong", () => {
  it("not found, error, global error, the gift's own not found and loading", async () => {
    const { default: NotFound } = await import("../not-found");
    render(<NotFound />);
    expect(screen.getByRole("heading").textContent).toBe(
      "Lá thư này lạc đường",
    );
    cleanup();
    const retry = vi.fn();
    const { default: ErrorPage } = await import("../error");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(<ErrorPage error={new Error("x")} retry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalled();
    cleanup();
    const { default: GlobalError } = await import("../global-error");
    render(<GlobalError error={new Error("x")} retry={retry} />, {
      container: document.documentElement,
    });
    expect(screen.getAllByText("Có gì đó trục trặc").length).toBeGreaterThan(0);
    cleanup();
    const { default: GiftNotFound } = await import("../g/[slug]/not-found");
    render(<GiftNotFound />);
    expect(screen.getByRole("heading").textContent).toBe(
      "Không tìm thấy tấm thiệp",
    );
    cleanup();
    const { default: GiftLoading } = await import("../g/[slug]/loading");
    render(<GiftLoading />);
    expect(screen.getByText("Đang mở thiệp…")).toBeTruthy();
  });
});
