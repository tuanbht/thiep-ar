import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeCard } from "@/lib/player/core/card";
import { loadTemplateFor } from "../loadTemplate";
import { T, T_BLUSH, wordsFor } from "../strings";

afterEach(() => vi.unstubAllGlobals());

describe("wordsFor", () => {
  it("speaks softly on a love card and keeps the player's own words elsewhere", () => {
    expect(wordsFor("night")).toBe(T);
    expect(wordsFor("blush")).toMatchObject(T_BLUSH);
    expect(wordsFor("blush").start).toBe(T.start); // what it does not change stays
  });
});

describe("loadTemplateFor", () => {
  const template = (categories: string[]) =>
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          kind: "3d",
          chapters: [0, 1],
          aspect: 0.625,
          categories,
        }),
      ),
    );
  const o = {
    fallbackHint: "Chạm để xem tiếp",
    blushHint: "Chạm nhẹ để xem tiếp nhé",
    missing: "?",
  };

  it("dresses a card in its template's theme, with the theme's hint at every stop", async () => {
    vi.stubGlobal("fetch", template(["love"]));
    const loaded = await loadTemplateFor(
      mergeCard({ template: "starry-date" }),
      o,
    );
    expect(loaded.theme).toBe("blush");
    expect(loaded.chapters.map((c) => c.hint)).toEqual([
      o.blushHint,
      o.blushHint,
    ]);
  });

  it("keeps the theme the shop gave the card", async () => {
    vi.stubGlobal("fetch", template(["love"]));
    const loaded = await loadTemplateFor(
      mergeCard({ template: "starry-date", theme: "night" }),
      o,
    );
    expect(loaded.theme).toBe("night");
    expect(loaded.chapters[0].hint).toBe(o.fallbackHint);
  });
});
