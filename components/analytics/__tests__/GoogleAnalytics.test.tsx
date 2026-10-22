// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/", search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));
vi.mock("next/script", () => ({
  default: (p: { src: string }) => <script data-testid="gtag" src={p.src} />,
}));

const views = () =>
  ((window as unknown as { dataLayer?: IArguments[] }).dataLayer ?? [])
    .map((a) => Array.from(a))
    .filter((c) => c[0] === "event" && c[1] === "page_view")
    .map((c) => c[2] as Record<string, unknown>);

const load = async () => {
  vi.resetModules();
  return (await import("../GoogleAnalytics")).GoogleAnalytics;
};
/** a client navigation: the address changes, the title is not there yet */
const go = (path: string) => {
  const [pathname, search = ""] = path.split("?");
  nav.pathname = pathname;
  nav.search = search;
  window.history.pushState({}, "", path);
  document.title = "";
};

beforeEach(() => {
  delete (window as unknown as { dataLayer?: unknown }).dataLayer;
  delete (window as unknown as { gtag?: unknown }).gtag;
  nav.pathname = "/";
  nav.search = "";
  window.history.pushState({}, "", "/");
  document.title = "Thiệp AR";
  vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TEST123");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("GoogleAnalytics", () => {
  it("loads nothing and counts nothing without a measurement id", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    const GoogleAnalytics = await load();
    const { container } = render(<GoogleAnalytics />);
    expect(container.innerHTML).toBe("");
    expect(views()).toEqual([]);
  });

  it("loads gtag.js for the id and counts the first page at once, a gift as its placeholder", async () => {
    const GoogleAnalytics = await load();
    const { getByTestId, rerender } = render(<GoogleAnalytics />);
    expect(getByTestId("gtag").getAttribute("src")).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    expect(views()).toEqual([
      expect.objectContaining({ page_title: "Thiệp AR" }),
    ]);
    go("/g/Xk2pQ9rT"); // a private page needs no title: it has its own
    rerender(<GoogleAnalytics />);
    expect(views()[1]).toMatchObject({
      page_location: "http://localhost:3000/g/[slug]",
      page_title: "Gift",
    });
  });

  it("waits for a client navigation's title, then counts the page with it", async () => {
    const GoogleAnalytics = await load();
    const { rerender } = render(<GoogleAnalytics />);
    go("/cards/mochi");
    rerender(<GoogleAnalytics />);
    expect(views()).toHaveLength(1); // not yet: no title
    await act(async () => {
      document.title = "Mochi · Thiệp AR";
      await Promise.resolve();
    });
    expect(views()[1]).toMatchObject({
      page_location: "http://localhost:3000/cards/mochi",
      page_title: "Mochi · Thiệp AR",
    });
  });

  it("counts the page untitled when its title is slow, or when the visitor moves on first", async () => {
    vi.useFakeTimers();
    const GoogleAnalytics = await load();
    const { rerender } = render(<GoogleAnalytics />);
    go("/cards/mochi");
    rerender(<GoogleAnalytics />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(views()[1]).toMatchObject({
      page_location: "http://localhost:3000/cards/mochi",
      page_title: "",
    });
    go("/cards/pip");
    rerender(<GoogleAnalytics />);
    go("/?q=me"); // gone before pip's title came
    rerender(<GoogleAnalytics />);
    expect(views()[2]).toMatchObject({
      page_location: "http://localhost:3000/cards/pip",
      page_title: "",
    });
  });
});
