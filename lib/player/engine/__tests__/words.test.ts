import { describe, expect, it, vi } from "vitest";
import { mergeCard, type Card } from "../../core/card";
import {
  balance,
  createWordsPainter,
  fontOf,
  kindsFor,
  textOf,
  wrap,
  wrapGiven,
} from "../words";
import type { Slot, Slots } from "../types";

/* jsdom has no 2D canvas: a fake context measures every glyph as half the font size wide and records what is drawn. */
interface Call {
  op: string;
  text?: string;
  font?: string;
  alpha?: number;
  args: unknown[];
}
function fakeCtx() {
  const calls: Call[] = [];
  const ctx = {
    font: "10px sans-serif",
    letterSpacing: "0px",
    fillStyle: "",
    strokeStyle: "",
    textAlign: "left",
    textBaseline: "top",
    lineJoin: "miter",
    lineWidth: 1,
    shadowColor: "",
    shadowBlur: 0,
    globalAlpha: 1,
    measureText(t: string) {
      const size = Number(/([\d.]+)px/.exec(ctx.font)?.[1] ?? 10);
      return { width: t.length * size * 0.5 };
    },
    clearRect: (...args: unknown[]) => calls.push({ op: "clear", args }),
    fillText: (text: string, ...args: unknown[]) =>
      calls.push({ op: "fill", text, font: ctx.font, args }),
    strokeText: (text: string, ...args: unknown[]) =>
      calls.push({ op: "stroke", text, font: ctx.font, args }),
    drawImage: (...args: unknown[]) =>
      calls.push({ op: "image", alpha: ctx.globalAlpha, args }),
  };
  return { ctx, calls };
}
function fakeCanvas(width: number, height: number) {
  const { ctx, calls } = fakeCtx();
  const canvas = {
    width,
    height,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx, calls };
}
const ctxOf = (size = 20) => {
  const { ctx } = fakeCtx();
  ctx.font = `${size}px x`;
  return ctx as unknown as CanvasRenderingContext2D;
};

const slotsWith = (slots: Record<string, Slot>, frames = 10): Slots => ({
  width: 1280,
  height: 800,
  fps: 24,
  frames,
  slots,
});
const box = (alpha?: number): Slot["boxes"][number] =>
  alpha === undefined ? [100, 100, 400, 80] : [100, 100, 400, 80, alpha];

function painterFor(
  card: Card,
  slots: Slots | null,
  extra: Partial<Parameters<typeof createWordsPainter>[0]> = {},
) {
  const main = fakeCanvas(1280, 800),
    layer = fakeCanvas(1280, 800);
  const painter = createWordsPainter({
    canvas: main.canvas,
    slots,
    card,
    fonts: null,
    makeCanvas: () => layer.canvas,
    ...extra,
  });
  const fills = () => layer.calls.filter((c) => c.op === "fill");
  return { painter, main, layer, fills };
}

describe("wrap", () => {
  it("keeps short words on one line", () => {
    expect(wrap(ctxOf(), "two words", 1000, 2)).toEqual(["two words"]);
  });
  it("breaks onto the next line when the width runs out", () => {
    expect(wrap(ctxOf(), "aaaa bbbb cccc", 80, 3)).toEqual([
      "aaaa",
      "bbbb",
      "cccc",
    ]);
  });
  it("gives up when the words need more lines than allowed", () => {
    expect(wrap(ctxOf(), "aaaa bbbb cccc", 80, 2)).toBeNull();
  });
  it("gives up when one word alone is too wide", () => {
    expect(wrap(ctxOf(), "a verylongwordthatcannotfit", 100, 3)).toBeNull();
    expect(wrap(ctxOf(), "verylongwordthatcannotfit", 100, 3)).toBeNull();
  });
});

describe("wrapGiven and balance", () => {
  it("keeps the card's own line breaks", () => {
    expect(wrapGiven(ctxOf(), ["one", "two"], 1000, 2)).toEqual(["one", "two"]);
  });
  it("wraps a long part too, while the lines last", () => {
    expect(wrapGiven(ctxOf(), ["aaaa bbbb", "cc"], 80, 3)).toEqual([
      "aaaa",
      "bbbb",
      "cc",
    ]);
    expect(wrapGiven(ctxOf(), ["aaaa bbbb", "cc"], 80, 2)).toBeNull();
  });
  it("evens the lines out", () => {
    const ctx = ctxOf(10),
      text = "aaa bbb ccc ddd eee"; // 5 px a letter
    const first = wrap(ctx, text, 75, 2)!;
    expect(first).toEqual(["aaa bbb ccc ddd", "eee"]);
    expect(balance(ctx, text, first, 75)).toEqual(["aaa bbb ccc", "ddd eee"]);
    expect(balance(ctx, "one", ["one"], 75)).toEqual(["one"]);
  });
});

describe("textOf", () => {
  const kinds = kindsFor(null);
  it("takes the slot's fixed text first, then the card's", () => {
    const card = mergeCard({
      template: "rain-clearing",
      slots: { s0: "From the card" },
    });
    expect(textOf(card, "s0", { boxes: [], text: " Fixed " }, kinds.text)).toBe(
      "Fixed",
    );
    expect(textOf(card, "s0", { boxes: [] }, kinds.text)).toBe("From the card");
    expect(textOf(card, "s1", { boxes: [] }, kinds.text)).toBe("");
  });
  it("upper-cases a sign", () => {
    const card = mergeCard({
      template: "rain-clearing",
      slots: { s0: "Chúc mừng" },
    });
    expect(textOf(card, "s0", { boxes: [] }, kinds.sign)).toBe("CHÚC MỪNG");
  });
  it("reads Night Mail's older signs and mailbox, and only Night Mail's", () => {
    const nm = mergeCard({
      template: "night-mail",
      signs: ["a", "b"],
      mailbox: "LINH",
    });
    expect(textOf(nm, "sign1", { boxes: [] }, kinds.text)).toBe("b");
    expect(textOf(nm, "sign7", { boxes: [] }, kinds.text)).toBe("");
    expect(textOf(nm, "mailbox", { boxes: [] }, kinds.text)).toBe("LINH");
    const other = mergeCard({
      template: "lift-off",
      signs: ["a", "b"],
      mailbox: "LINH",
    });
    expect(textOf(other, "sign1", { boxes: [] }, kinds.text)).toBe("");
    expect(textOf(other, "mailbox", { boxes: [] }, kinds.text)).toBe("");
  });
});

describe("fontOf and kindsFor", () => {
  it("writes a CSS font with its style, weight and size", () => {
    expect(fontOf({ italic: true, weight: 400, family: "Serif" }, 12.34)).toBe(
      "italic 400 12.3px Serif",
    );
    expect(fontOf({ family: "X" }, 10)).toBe("400 10.0px X");
  });
  it("uses the template's sign face", () => {
    expect(kindsFor({ ...slotsWith({}), font: "Oswald" }).sign.family).toMatch(
      /^"Oswald"/,
    );
    expect(kindsFor(null).label.family).toMatch(/^"Barlow Condensed"/);
  });
});

describe("createWordsPainter", () => {
  it("paints each slot at its box and tells when it has", () => {
    const onPainted = vi.fn();
    const card = mergeCard({ template: "t", slots: { s0: "Hello there" } });
    const { painter, main, fills } = painterFor(
      card,
      slotsWith({ s0: { kind: "text", boxes: [box()] } }),
      { onPainted },
    );
    painter.draw(0);
    expect(fills().map((c) => c.text)).toEqual(["Hello there"]);
    expect(main.calls.filter((c) => c.op === "image")).toHaveLength(1);
    expect(onPainted).toHaveBeenCalledTimes(1);
  });

  it("shrinks words until they fit their lines", () => {
    const card = mergeCard({
      template: "t",
      slots: { s0: "a much longer line of words than the board holds" },
    });
    const { painter, fills } = painterFor(
      card,
      slotsWith({ s0: { kind: "label", boxes: [[0, 0, 200, 40]] } }),
    );
    painter.draw(0);
    const size = Number(/([\d.]+)px/.exec(fills()[0].font!)![1]);
    expect(size).toBeLessThan(40);
    expect(fills()).toHaveLength(1);
  });

  it("keeps the card's line breaks when the box has room for them", () => {
    const card = mergeCard({
      template: "t",
      slots: { s0: "First line\nSecond line" },
    });
    const { painter, fills } = painterFor(
      card,
      slotsWith({ s0: { kind: "text", boxes: [[0, 0, 1000, 200]] } }),
    );
    painter.draw(0);
    expect(fills().map((c) => c.text)).toEqual(["First line", "Second line"]);
  });

  it("upper-cases a sign and balances when asked", () => {
    const card = mergeCard({
      template: "t",
      slots: { s0: "aaa bbb ccc ddd eee" },
    });
    const { painter, fills } = painterFor(
      card,
      slotsWith({
        s0: {
          kind: "sign",
          style: { balance: true, size: 10 },
          boxes: [[0, 0, 75, 40]],
        },
      }),
    );
    painter.draw(0);
    expect(fills().map((c) => c.text)).toEqual(["AAA BBB CCC", "DDD EEE"]);
  });

  it("paints Night Mail's older signs", () => {
    const card = mergeCard({
      template: "night-mail",
      signs: ["Rời đi lúc hoàng hôn"],
    });
    const { painter, fills } = painterFor(
      card,
      slotsWith({ sign0: { kind: "sign", boxes: [box()] } }),
    );
    painter.draw(0);
    expect(fills()[0].text).toBe("RỜI ĐI LÚC HOÀNG HÔN");
  });

  it("skips a slot that is faded out, missing in the frame or has no words", () => {
    const card = mergeCard({ template: "t", slots: { a: "A", b: "B" } });
    const { painter, fills, main } = painterFor(
      card,
      slotsWith({
        a: { boxes: [box(0)] },
        b: { boxes: [null] },
        c: { boxes: [box()] },
      }),
    );
    painter.draw(0);
    expect(fills()).toHaveLength(0);
    expect(main.calls.filter((c) => c.op === "image")).toHaveLength(0);
  });

  it("lays a fading slot on at its alpha", () => {
    const card = mergeCard({ template: "t", slots: { a: "A" } });
    const { painter, main } = painterFor(
      card,
      slotsWith({ a: { boxes: [box(0.4)] } }),
    );
    painter.draw(0);
    expect(main.calls.find((c) => c.op === "image")?.alpha).toBe(0.4);
  });

  it("paints a frame once, and again after draw(-1)", () => {
    const card = mergeCard({ template: "t", slots: { a: "A" } });
    const { painter, fills } = painterFor(
      card,
      slotsWith({ a: { boxes: [box(), box()] } }),
    );
    painter.draw(1);
    painter.draw(1);
    expect(fills()).toHaveLength(1);
    painter.draw(-1);
    painter.draw(1);
    expect(fills()).toHaveLength(2);
  });

  it("reads the card live, so a tool can swap its words", () => {
    const card = mergeCard({ template: "t", slots: { a: "Before" } });
    const { painter, fills } = painterFor(
      card,
      slotsWith({ a: { boxes: [box()] } }),
    );
    painter.draw(0);
    card.slots = { a: "After" };
    painter.draw(-1);
    painter.draw(0);
    expect(fills().map((c) => c.text)).toEqual(["Before", "After"]);
  });

  it("outlines, shadows and spaces letters as the style says, at its alignment", () => {
    const card = mergeCard({
      template: "t",
      slots: { a: "Hi", b: "Yo", c: "Ok" },
    });
    const { painter, layer } = painterFor(
      card,
      slotsWith({
        a: {
          style: {
            stroke: 0.05,
            shadow: "#000",
            letterSpacing: 0.1,
            align: "right",
            valign: "bottom",
          },
          boxes: [box()],
        },
        b: { kind: "label", boxes: [box()] },
        c: { style: { align: "left", valign: "top" }, boxes: [box()] },
      }),
    );
    painter.draw(0);
    const stroke = layer.calls.find((c) => c.op === "stroke");
    expect(stroke?.text).toBe("Hi");
    expect(stroke?.args[0]).toBe(500); // right-aligned: x + w
    const label = layer.calls.find((c) => c.op === "fill" && c.text === "YO");
    expect(label?.args[0]).toBe(300); // centred: x + w / 2
    expect(label?.args[2]).toBeCloseTo(400 * 1.05); // a centred line may squeeze to 105% of the box
  });

  it("gives the film frame at a time, inside the film", () => {
    const { painter } = painterFor(mergeCard({}), slotsWith({}, 48));
    expect(painter.frameAt(0)).toBe(0);
    expect(painter.frameAt(1)).toBe(24);
    expect(painter.frameAt(99)).toBe(47);
    expect(painter.frameAt(-3)).toBe(0);
  });

  it("does nothing without slots", async () => {
    const { painter, main } = painterFor(mergeCard({}), null);
    painter.draw(0);
    expect(main.calls).toHaveLength(0);
    expect(painter.frameAt(5)).toBe(0);
    await expect(painter.facesReady).resolves.toBeUndefined();
  });

  it("asks for every face the card's words need, and stops waiting in time", async () => {
    const load = vi.fn(() => new Promise<FontFace[]>(() => {})); // never comes
    const fonts = {
      load,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as FontFaceSet;
    const card = mergeCard({ template: "t", slots: { a: "Xin chào" } });
    const { painter } = painterFor(
      card,
      slotsWith({
        a: { kind: "caption", boxes: [box()] },
        b: { boxes: [box()] },
      }),
      { fonts, facesWait: 20 },
    );
    await expect(painter.facesReady).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(2); // the sign face, and the caption's face with its words
    expect(load).toHaveBeenLastCalledWith(
      expect.stringMatching(/^italic 400 40\.0px "Newsreader"/),
      "Xin chào",
    );
  });

  it("waits for the template's stylesheet before loading faces", async () => {
    const load = vi.fn(() => Promise.resolve([] as FontFace[]));
    const fonts = {
      load,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as FontFaceSet;
    let sheet!: () => void;
    const after = new Promise<void>((r) => {
      sheet = r;
    });
    const { painter } = painterFor(mergeCard({}), slotsWith({}), {
      fonts,
      after,
      facesWait: 1000,
    });
    await Promise.resolve();
    expect(load).not.toHaveBeenCalled();
    sheet();
    await painter.facesReady;
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("survives a face list the browser will not parse", async () => {
    const fonts = {
      load: () => {
        throw new Error("bad font");
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as FontFaceSet;
    const { painter } = painterFor(mergeCard({}), slotsWith({}), {
      fonts,
      facesWait: 1000,
    });
    await expect(painter.facesReady).resolves.toBeUndefined();
  });

  it("paints again when a late face comes in, and stops listening when disposed", () => {
    let done: (() => void) | undefined;
    const fonts = {
      load: () => Promise.resolve([]),
      addEventListener: vi.fn((_: string, f: () => void) => {
        done = f;
      }),
      removeEventListener: vi.fn(),
    } as unknown as FontFaceSet;
    const card = mergeCard({ template: "t", slots: { a: "A" } });
    const { painter, fills } = painterFor(
      card,
      slotsWith({ a: { boxes: [box(), box()] } }),
      { fonts, frameNow: () => 1 },
    );
    painter.draw(1);
    done!();
    expect(fills()).toHaveLength(2);
    painter.dispose();
    expect(fonts.removeEventListener).toHaveBeenCalledWith("loadingdone", done);
    painter.draw(-1);
    painter.draw(1);
    expect(fills()).toHaveLength(2);
  });

  it("repaints the last frame when nothing says which frame shows", () => {
    let done: (() => void) | undefined;
    const fonts = {
      load: () => Promise.resolve([]),
      addEventListener: (_: string, f: () => void) => {
        done = f;
      },
      removeEventListener: vi.fn(),
    } as unknown as FontFaceSet;
    const card = mergeCard({ template: "t", slots: { a: "A" } });
    const { painter, fills } = painterFor(
      card,
      slotsWith({ a: { boxes: [box()] } }),
      { fonts },
    );
    done!(); // nothing painted yet: nothing to repaint
    expect(fills()).toHaveLength(0);
    painter.draw(0);
    done!();
    expect(fills()).toHaveLength(2);
  });
});
