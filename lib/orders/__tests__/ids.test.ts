import { describe, expect, it } from "vitest";
import { makeOrderCode, makeSlug, randomString, SLUG_RE, vnDate } from "../ids";

/** a random source that hands out these bytes, in turn, forever */
const bytes = (...seq: number[]) => {
  let i = 0;
  return (n: number) =>
    Uint8Array.from({ length: n }, () => seq[i++ % seq.length]);
};

describe("gift slugs", () => {
  it("are 10 base62 characters", () => {
    for (let i = 0; i < 200; i++) expect(makeSlug()).toMatch(SLUG_RE);
  });

  it("differ every time", () => {
    const seen = new Set(Array.from({ length: 2000 }, () => makeSlug()));
    expect(seen.size).toBe(2000);
  });

  it("use every character of the alphabet evenly (bytes that would bias it are drawn again)", () => {
    // 248..255 would favour the first 8 characters: they are skipped, so 0, 1, 2 come from 0, 1, 2 and 62 wraps to 0
    expect(
      randomString(
        4,
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        bytes(250, 0, 255, 1, 62, 2),
      ),
    ).toBe("abac");
  });
});

describe("order codes", () => {
  it("carry the day in Vietnam time and five readable characters", () => {
    expect(makeOrderCode(new Date("2026-10-16T18:30:00Z"))).toMatch(
      /^GC-261017-[2-9A-HJKMNP-Z]{5}$/,
    );
  });

  it("turn the day at midnight in Vietnam, not in UTC", () => {
    expect(vnDate(new Date("2026-10-16T16:59:59Z"))).toBe("261016");
    expect(vnDate(new Date("2026-10-16T17:00:00Z"))).toBe("261017");
    expect(vnDate(new Date("2026-12-31T17:00:00Z"))).toBe("270101");
  });

  it("never use 0, O, 1, I or L", () => {
    for (let i = 0; i < 300; i++)
      expect(makeOrderCode(new Date()).slice(10)).not.toMatch(/[01OIL]/);
  });
});
