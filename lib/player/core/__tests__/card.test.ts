import { describe, expect, it } from "vitest";
import { CARD_DEFAULTS, mergeCard, safeId } from "../card";

describe("card", () => {
  it("fills every field and keeps only the right types", () => {
    const c = mergeCard({
      template: "mochi",
      title: 7,
      letter: { body: ["a", 2, null] },
      slots: { board: "Hi", n: 3, bad: {} },
      design: "../x",
    });
    expect(c).toMatchObject({
      template: "mochi",
      title: "7",
      design: "x",
      slots: { board: "Hi", n: "3" },
    });
    expect(c.letter).toEqual({
      to: CARD_DEFAULTS.letter.to,
      body: ["a", "2", ""],
      from: CARD_DEFAULTS.letter.from,
    });
    expect(mergeCard(null).template).toBe("night-mail");
    expect(mergeCard({ design: "" })).not.toHaveProperty("design");
  });

  it("keeps ids to safe path segments", () => {
    expect(safeId("../a b/c")).toBe("abc");
    expect(safeId(undefined)).toBe("");
  });

  it("takes the photos as a list, or the one photo of a card made before lists; photo is always the first", () => {
    expect(
      mergeCard({ photos: ["https://p/1.jpg", 7, "", "https://p/2.jpg"] }),
    ).toMatchObject({
      photo: "https://p/1.jpg",
      photos: ["https://p/1.jpg", "https://p/2.jpg"],
    });
    expect(mergeCard({ photo: "https://p/old.jpg" })).toMatchObject({
      photo: "https://p/old.jpg",
      photos: ["https://p/old.jpg"],
    });
    expect(
      mergeCard({ photo: "https://p/old.jpg", photos: ["https://p/new.jpg"] })
        .photos,
    ).toEqual(["https://p/new.jpg"]);
    expect(mergeCard({ photos: [] })).toMatchObject({ photo: "", photos: [] });
  });
});
