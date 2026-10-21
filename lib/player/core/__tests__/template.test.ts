import { describe, expect, it } from "vitest";
import {
  actMiddle,
  chaptersOf,
  kindOf,
  parseTemplate,
  targetsUrl,
  templateDir,
} from "../template";

describe("template", () => {
  it("lives at an absolute path, so a page at any depth finds it, and never outside templates/", () => {
    expect(templateDir("flower-letter")).toBe("/templates/flower-letter");
    expect(templateDir("../../etc")).toBe("/templates/etc");
  });

  it("reads template.json, refusing one without chapters and defaulting the aspect", () => {
    expect(parseTemplate({ kind: "3d", chapters: [0, 1] })).toMatchObject({
      kind: "3d",
      aspect: 0.625,
    });
    expect(parseTemplate({ chapters: [1.5], aspect: 0.7 }).aspect).toBe(0.7);
    expect(() => parseTemplate(null)).toThrow("not an object");
    expect(() => parseTemplate({ chapters: [] })).toThrow("no chapters");
    expect(() => parseTemplate({ chapters: ["x"] })).toThrow("no chapters");
  });

  it("is a film unless it says 3d", () => {
    expect(kindOf({ kind: "3d", aspect: 1, chapters: [0] })).toBe("3d");
    expect(kindOf({ aspect: 1, chapters: [0] })).toBe("film");
  });

  it("says the same at every stop (a tap plays on), and marks where the envelope rises", () => {
    const c = chaptersOf(
      { aspect: 1, chapters: [1, 2, 3], reveal: 1 },
      "Chạm để xem tiếp",
    );
    expect(c.map((x) => x.hint)).toEqual([
      "Chạm để xem tiếp",
      "Chạm để xem tiếp",
      "Chạm để xem tiếp",
    ]);
    expect(c.map((x) => x.reveal)).toEqual([false, true, false]);
    expect(
      chaptersOf({ aspect: 1, chapters: [1, 2] }).map((x) => [
        x.hint,
        x.reveal,
      ]),
    ).toEqual([
      ["Tap to continue", false],
      ["Tap to continue", true],
    ]);
    expect(
      chaptersOf({ aspect: 1, chapters: [1, 2], reveal: null }).some(
        (x) => x.reveal,
      ),
    ).toBe(false);
  });

  it("tracks the card's own design when it has one", () => {
    expect(targetsUrl("/templates/rain", {})).toBe(
      "/templates/rain/targets.mind",
    );
    expect(targetsUrl("/templates/rain", { design: "lam-lanh/../x" })).toBe(
      "/templates/rain/designs/lam-lanhx.mind",
    );
  });

  it("puts the act's middle half its height up, within reason", () => {
    expect(actMiddle({ aspect: 1, chapters: [0], height: 0.3 })).toBeCloseTo(
      0.15,
    );
    expect(
      actMiddle({ aspect: 1, chapters: [0], modelHeight: 0.62, scale: 0.85 }),
    ).toBeCloseTo(0.2635);
    expect(actMiddle({ aspect: 1, chapters: [0] })).toBeCloseTo(0.2);
    expect(actMiddle({ aspect: 1, chapters: [0], height: 5 })).toBe(0.35);
    expect(actMiddle({ aspect: 1, chapters: [0], height: 0.01 })).toBe(0.1);
  });
});
