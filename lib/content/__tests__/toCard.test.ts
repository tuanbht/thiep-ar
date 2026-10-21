import { describe, expect, it } from "vitest";
import { toCard } from "../toCard";

const content = {
  title: "Gửi em",
  intro: "",
  letter: { to: "Gửi em,", body: ["Thương em."], from: "Anh" },
  slots: {},
  photoPaths: [],
};

describe("toCard", () => {
  it("opens in the template's theme when it is known", () => {
    expect(
      toCard(
        content,
        { template: "starry-date", design: null, theme: "blush" },
        [],
      ).theme,
    ).toBe("blush");
  });

  it("leaves the theme to the player when it is not", () => {
    expect(
      toCard(
        content,
        { template: "starry-date", design: null, theme: null },
        [],
      ),
    ).not.toHaveProperty("theme");
  });
});
