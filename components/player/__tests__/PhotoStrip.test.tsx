// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PhotoFan,
  PhotoStrip,
  photoAt,
  STRIP_SIZE,
  TURN_MS,
} from "../PhotoStrip";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const srcs = (c: HTMLElement) =>
  [...c.querySelectorAll("img")].map((i) => i.getAttribute("src"));
const urls = (n: number) =>
  Array.from({ length: n }, (_, i) => `https://p/${i}.jpg`);

describe("photoAt", () => {
  it("turns one polaroid at a time, each to the next photo in line, never two alike", () => {
    const at = (t: number) => [0, 1, 2, 3].map((j) => photoAt(j, t, 4, 6));
    expect(at(0)).toEqual([0, 1, 2, 3]);
    expect(at(1)).toEqual([4, 1, 2, 3]);
    expect(at(2)).toEqual([4, 5, 2, 3]);
    expect(at(3)).toEqual([4, 5, 0, 3]);
    for (let t = 0; t < 40; t++) expect(new Set(at(t)).size).toBe(4);
  });
});

describe("PhotoStrip", () => {
  it("shows each photo once, four at most, and nothing without photos", () => {
    expect(srcs(render(<PhotoStrip photos={urls(2)} />).container)).toEqual(
      urls(2),
    );
    cleanup();
    expect(
      srcs(render(<PhotoStrip photos={urls(7)} />).container),
    ).toHaveLength(STRIP_SIZE);
    cleanup();
    expect(render(<PhotoStrip photos={[]} />).container.innerHTML).toBe("");
  });

  it("brings every photo round when there are more photos than polaroids", () => {
    vi.useFakeTimers();
    const { container } = render(<PhotoStrip photos={urls(6)} />);
    const seen = new Set(srcs(container));
    for (let i = 0; i < 2; i++) {
      act(() => {
        vi.advanceTimersByTime(TURN_MS);
      });
      srcs(container).forEach((s) => seen.add(s));
    }
    expect(seen.size).toBe(6);
  });

  it("keeps still for someone who asked for less motion", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "matchMedia",
      (q: string) => ({ matches: q.includes("reduce") }) as MediaQueryList,
    );
    try {
      const { container } = render(<PhotoStrip photos={urls(6)} />);
      const before = srcs(container);
      act(() => {
        vi.advanceTimersByTime(TURN_MS * 3);
      });
      expect(srcs(container)).toEqual(before);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("stops turning when it goes", () => {
    vi.useFakeTimers();
    const { unmount } = render(<PhotoStrip photos={urls(6)} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("leaves out a photo whose link ran out", () => {
    const { container } = render(<PhotoStrip photos={urls(2)} />);
    fireEvent.error(container.querySelector("img")!);
    expect(srcs(container)).toEqual([urls(2)[1]]);
  });
});

describe("PhotoFan", () => {
  it("fans up to three photos, and nothing without photos", () => {
    expect(srcs(render(<PhotoFan photos={urls(5)} />).container)).toEqual(
      urls(3),
    );
    cleanup();
    expect(render(<PhotoFan photos={[]} />).container.innerHTML).toBe("");
  });
});
