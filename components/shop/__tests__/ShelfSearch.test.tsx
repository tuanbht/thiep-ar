// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShelfCategory } from "@/lib/domain/types";

const push = vi.fn(),
  replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("next/link", () => ({
  // a plain link: its own click handler decides
  default: ({
    href,
    children,
    onClick,
    className,
    title,
    "aria-current": current,
  }: React.ComponentProps<"a">) => (
    <a
      href={href}
      onClick={onClick}
      className={className}
      title={title}
      aria-current={current}
    >
      {children}
    </a>
  ),
}));

const { ShelfSearch } = await import("../ShelfSearch");

const categories: ShelfCategory[] = [
  { id: "love", name: "Tình yêu", blurb: null, sort: 10, count: 18 },
  { id: "birthday", name: "Sinh nhật", blurb: null, sort: 20, count: 8 },
];
const shelf = (
  over: { query?: string; category?: string | null; total?: number } = {},
) => (
  <ShelfSearch
    categories={categories}
    query={over.query ?? ""}
    category={over.category ?? null}
    total={over.total ?? 26}
  >
    <p>the cards</p>
  </ShelfSearch>
);
/** where a navigation went: its words and category */
const went = (fn: typeof push) => {
  const [href, opts] = fn.mock.calls.at(-1)!;
  const url = new URL(href, "https://thiep.example");
  return {
    path: url.pathname,
    q: url.searchParams.get("q"),
    c: url.searchParams.get("c"),
    opts,
  };
};
const box = () =>
  screen.getByRole("searchbox", { name: "Tìm thiệp" }) as HTMLInputElement;

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("ShelfSearch", () => {
  it("offers the words typed so far, every category with how many, and the cards", () => {
    render(shelf({ query: "mưa", category: "love", total: 3 }));
    expect(box().value).toBe("mưa");
    const tags = screen.getAllByRole("link").filter((a) => a.closest("nav"));
    expect(tags.map((a) => a.textContent)).toEqual([
      "Tất cả",
      "Tình yêu18",
      "Sinh nhật8",
    ]);
    expect(tags[1].getAttribute("aria-current")).toBe("true");
    expect(tags[2].getAttribute("href")).toBe("/?q=m%C6%B0a&c=birthday#shelf"); // works without JavaScript too
    expect(screen.getByText("the cards")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "3 thiệp cho “mưa” trong Tình yêu",
    );
  });

  it("searches a moment after the last key, keeping the category, without scrolling or piling up history", async () => {
    vi.useFakeTimers();
    render(shelf({ category: "love" }));
    fireEvent.change(box(), { target: { value: "mư" } });
    fireEvent.change(box(), { target: { value: "mưa" } });
    expect(replace).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(went(replace)).toEqual({
      path: "/",
      q: "mưa",
      c: "love",
      opts: { scroll: false },
    });
  });

  it("searches at once on Enter, and empties the box with its clear button", () => {
    render(shelf({ query: "biển" }));
    fireEvent.change(box(), { target: { value: "hoàng hôn" } });
    fireEvent.submit(box().closest("form")!);
    expect(went(push)).toMatchObject({ q: "hoàng hôn", c: null });
    fireEvent.click(screen.getByRole("button", { name: "Xoá chữ đã gõ" }));
    expect(box().value).toBe("");
    expect(went(replace)).toMatchObject({ path: "/", q: null, c: null });
  });

  it("picks a category with the words typed, and picking it again lets it go", () => {
    const view = render(shelf({ query: "mưa" }));
    fireEvent.click(screen.getByRole("link", { name: /Tình yêu/ }));
    expect(went(push)).toEqual({
      path: "/",
      q: "mưa",
      c: "love",
      opts: { scroll: false },
    });
    view.rerender(shelf({ query: "mưa", category: "love" }));
    fireEvent.click(screen.getByRole("link", { name: /Tình yêu/ }));
    expect(went(push)).toMatchObject({ q: "mưa", c: null });
    fireEvent.click(screen.getByRole("link", { name: "Tất cả" }));
    expect(went(push)).toMatchObject({ q: "mưa", c: null });
  });

  it("follows the address when it changes elsewhere (Back), and says nothing when the shelf is not filtered", () => {
    const view = render(shelf({ query: "mưa", total: 5 }));
    view.rerender(shelf({ query: "biển", total: 4 }));
    expect(box().value).toBe("biển");
    view.rerender(shelf({ query: "", total: 26 }));
    expect(box().value).toBe("");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("asks once for the same words, and keeps the spaces as typed", async () => {
    vi.useFakeTimers();
    const view = render(shelf());
    fireEvent.change(box(), { target: { value: "mưa  rào" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(went(replace)).toMatchObject({ q: "mưa rào" });
    view.rerender(shelf({ query: "mưa rào", total: 2 })); // the shelf found it
    expect(box().value).toBe("mưa  rào"); // the box is not rewritten under the fingers
    fireEvent.change(box(), { target: { value: "mưa  rào " } });
    fireEvent.change(box(), { target: { value: "!!!" } });
    fireEvent.change(box(), { target: { value: "mưa rào" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("searches at once when the box is left, so a card clicked in the pause still opens", async () => {
    vi.useFakeTimers();
    render(shelf());
    fireEvent.change(box(), { target: { value: "biển" } });
    fireEvent.blur(box()); // a press on a card takes the focus first
    expect(went(replace)).toMatchObject({ q: "biển" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(replace).toHaveBeenCalledTimes(1); // nothing later to cut the card's navigation short
  });

  it("asks nothing once it is gone, and forgets words not searched when the page is left", async () => {
    vi.useFakeTimers();
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>{shelf({ query: "mưa" })}</Activity>
    );
    const view = render(page("visible"));
    fireEvent.change(box(), { target: { value: "mưa x" } });
    view.rerender(page("hidden")); // the router keeps the page while a card is open
    view.rerender(page("visible")); // Back: the box says what the shelf shows
    expect(box().value).toBe("mưa");
    fireEvent.change(box(), { target: { value: "mưa y" } });
    view.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("leaves a modified click to the browser (a new tab)", () => {
    render(shelf());
    fireEvent.click(screen.getByRole("link", { name: /Sinh nhật/ }), {
      ctrlKey: true,
    });
    expect(push).not.toHaveBeenCalled();
  });
});
