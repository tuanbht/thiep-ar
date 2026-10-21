import { describe, expect, it } from "vitest";
import { mergeCard } from "../../core/card";
import { paintPhotos, quadPoint, shuffled, type PhotoImage } from "../photos";
import { createWordsPainter } from "../words";
import type { PhotoOverlay, PhotoPlace, PhotoQuad, Slots } from "../types";

/* jsdom has no 2D canvas: a fake context records what is drawn, in order. */
function fakeCtx() {
  const calls: { op: string; args: unknown[]; alpha: number; fill?: string }[] =
    [];
  const ctx: Record<string, unknown> = {
    globalAlpha: 1,
    fillStyle: "",
    font: "10px x",
    letterSpacing: "0px",
    strokeStyle: "",
    textAlign: "left",
    textBaseline: "top",
    lineJoin: "miter",
    lineWidth: 1,
    shadowColor: "",
    shadowBlur: 0,
    measureText: (t: string) => ({ width: t.length * 5 }),
  };
  for (const op of [
    "save",
    "restore",
    "translate",
    "rotate",
    "beginPath",
    "rect",
    "clip",
    "fillRect",
    "drawImage",
    "clearRect",
    "fillText",
    "strokeText",
    "moveTo",
    "lineTo",
    "closePath",
    "fill",
    "transform",
    "setTransform",
  ])
    ctx[op] = (...args: unknown[]) =>
      calls.push({
        op,
        args,
        alpha: ctx.globalAlpha as number,
        fill: op === "fillRect" ? String(ctx.fillStyle) : undefined,
      });
  ctx.createLinearGradient = (...args: unknown[]) => {
    const stops: unknown[] = [];
    calls.push({
      op: "createLinearGradient",
      args: [...args, stops],
      alpha: ctx.globalAlpha as number,
    });
    return {
      addColorStop: (...s: unknown[]) => stops.push(s),
      toString: () => "gradient",
    };
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}
const img = (width: number, height: number, name: string) =>
  ({ width, height, name }) as unknown as PhotoImage;
const place = (boxes: PhotoPlace["boxes"], blank?: string): PhotoPlace => ({
  boxes,
  ...(blank && { blank }),
});

describe("paintPhotos", () => {
  it("lays each photo in its place for the frame: turned, filling the place, at its opacity", () => {
    const { ctx, calls } = fakeCtx();
    const a = img(400, 200, "a");
    paintPhotos(ctx, [place([null, [100, 50, 200, 100, 0.5, 90]])], 1, [a]);
    expect(calls.map((c) => c.op)).toEqual([
      "save",
      "translate",
      "rotate",
      "beginPath",
      "rect",
      "clip",
      "drawImage",
      "restore",
    ]);
    expect(calls[1].args).toEqual([200, 100]); // the place's centre
    expect(calls[2].args[0]).toBeCloseTo(Math.PI / 2);
    const draw = calls.find((c) => c.op === "drawImage")!;
    expect(draw.args).toEqual([a, 0, 0, 400, 200, -100, -50, 200, 100]); // a 2:1 photo fills a 2:1 place exactly
    expect(draw.alpha).toBe(0.5);
  });

  it("develops a print: its blank colour first, the photo coming through over it", () => {
    const { ctx, calls } = fakeCtx();
    paintPhotos(ctx, [place([[0, 0, 100, 100, 1, 0, 0.25]], "#ddd5c4")], 0, [
      img(100, 100, "a"),
    ]);
    const fill = calls.find((c) => c.op === "fillRect")!,
      draw = calls.find((c) => c.op === "drawImage")!;
    expect(fill).toMatchObject({ fill: "#ddd5c4", alpha: 1 });
    expect(draw.alpha).toBe(0.25);
    expect(calls.indexOf(fill)).toBeLessThan(calls.indexOf(draw));
  });

  it("crops a photo to its place, keeping its shape", () => {
    const { ctx, calls } = fakeCtx();
    paintPhotos(ctx, [place([[0, 0, 100, 100]])], 0, [img(300, 100, "wide")]);
    expect(calls.find((c) => c.op === "drawImage")!.args).toEqual([
      expect.anything(),
      100,
      0,
      100,
      100, // its middle square
      -50,
      -50,
      100,
      100,
    ]);
  });

  it("leaves a place alone where the card has no photo for it, or the frame has no box: the film's own picture shows", () => {
    const { ctx, calls } = fakeCtx();
    paintPhotos(
      ctx,
      [
        place([[0, 0, 10, 10]]),
        place([[0, 0, 10, 10]]),
        place([null]),
        place([[0, 0, 10, 10, 0]]),
      ],
      0,
      [img(10, 10, "a"), null, img(10, 10, "c"), img(10, 10, "d")],
    );
    expect(calls.filter((c) => c.op === "drawImage")).toHaveLength(1);
  });
});

describe("paintPhotos, for a place given by its four corners", () => {
  const Q = {
    quad: [100, 100, 300, 100, 300, 200, 100, 200] as [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ],
  };

  it("maps the photo onto a flat place exactly: one image, its corners on the place's corners", () => {
    const { ctx, calls } = fakeCtx();
    paintPhotos(ctx, [place([Q])], 0, [img(400, 200, "a")]);
    expect(calls.filter((c) => c.op === "drawImage")).toHaveLength(1);
    expect(calls.find((c) => c.op === "transform")!.args).toEqual([
      200, 0, 0, 100, 100, 100,
    ]); // the unit square onto the place
    expect(calls.find((c) => c.op === "drawImage")!.args).toEqual([
      expect.anything(),
      0,
      0,
      400,
      200,
      0,
      0,
      1,
      1,
    ]);
  });

  it("crops to the place's shape: a square photo in a 2:1 place keeps its middle", () => {
    const { ctx, calls } = fakeCtx();
    paintPhotos(ctx, [place([Q])], 0, [img(300, 300, "sq")]);
    expect(calls.find((c) => c.op === "drawImage")!.args).toEqual([
      expect.anything(),
      0,
      75,
      300,
      150,
      0,
      0,
      1,
      1,
    ]);
  });

  it("draws a place seen in perspective (a page turning) in pieces on a layer, laid on once at its opacity: no seams show", () => {
    const { ctx, calls } = fakeCtx(),
      scratch = fakeCtx();
    const layer = {
      width: 1280,
      height: 800,
      getContext: () => scratch.ctx,
    } as unknown as HTMLCanvasElement;
    paintPhotos(
      ctx,
      [place([{ quad: [100, 100, 260, 120, 260, 180, 100, 200], alpha: 0.5 }])],
      0,
      [img(100, 100, "p")],
      { layer },
    );
    expect(
      scratch.calls.filter((c) => c.op === "drawImage").length,
    ).toBeGreaterThan(20); // the pieces, opaque, on the layer
    const laid = calls.filter((c) => c.op === "drawImage");
    expect(laid).toHaveLength(1);
    expect(laid[0]).toMatchObject({
      alpha: 0.5,
      args: [layer, 99, 99, 162, 102, 99, 99, 162, 102],
    }); // its bounds and the pixel each piece grows by
  });

  it("crops by the picture's own shape when given, so the photo never seems to zoom as a page turns", () => {
    const { ctx, calls } = fakeCtx();
    const halfTurned: PhotoQuad = [100, 100, 150, 100, 150, 200, 100, 200]; // a 2:1 picture, half as wide on screen
    paintPhotos(ctx, [{ aspect: 2, boxes: [{ quad: halfTurned }] }], 0, [
      img(400, 400, "sq"),
    ]);
    expect(calls.find((c) => c.op === "drawImage")!.args).toEqual([
      expect.anything(),
      0,
      100,
      400,
      200,
      0,
      0,
      1,
      1,
    ]);
  });

  it("maps a place in perspective truly: corners on corners, the middle where the diagonals cross", () => {
    const q: PhotoQuad = [100, 100, 300, 140, 300, 260, 100, 300]; // a page seen at an angle: its far edge shorter
    for (const [u, v, x, y] of [
      [0, 0, 100, 100],
      [1, 0, 300, 140],
      [1, 1, 300, 260],
      [0, 1, 100, 300],
      [0.5, 0.5, 225, 200],
    ]) {
      const [px, py] = quadPoint(q, u, v);
      expect(px, `${u},${v}`).toBeCloseTo(x);
      expect(py, `${u},${v}`).toBeCloseTo(y);
    }
  });

  it("lays the film's shade or glare over the photo: a gradient across the picture as it is oriented, at its opacity", () => {
    const { ctx, calls } = fakeCtx(),
      pic = fakeCtx();
    const scratch = {
      width: 0,
      height: 0,
      getContext: () => pic.ctx,
    } as unknown as HTMLCanvasElement;
    const shade: PhotoOverlay = {
      from: [0, 0.5],
      to: [1, 0.5],
      stops: [
        [0, "rgba(28,16,6,.36)"],
        [1, "rgba(28,16,6,0)"],
      ],
      alpha: 0.8,
    };
    const glare: PhotoOverlay = {
      from: [0, 0],
      to: [0.4, 0.3],
      stops: [
        [0, "rgba(255,255,255,.18)"],
        [1, "rgba(255,255,255,0)"],
      ],
    };
    paintPhotos(
      ctx,
      [{ aspect: 2, overlay: [glare], boxes: [{ ...Q, overlay: [shade] }] }],
      0,
      [img(400, 200, "a")],
      { scratch },
    );
    const W = scratch.width,
      H = scratch.height;
    expect(W / H).toBeCloseTo(2);
    expect(pic.calls.find((c) => c.op === "drawImage")).toMatchObject({
      args: [expect.anything(), 0, 0, 400, 200, 0, 0, W, H],
    }); // the photo's crop first
    const grads = pic.calls.filter((c) => c.op === "createLinearGradient");
    expect(grads.map((g) => g.args.slice(0, 4))).toEqual([
      [0, 0, 0.4 * W, 0.3 * H],
      [0, H / 2, W, H / 2],
    ]); // the place's, then the frame's
    expect(grads[1].args[4]).toEqual([
      [0, "rgba(28,16,6,.36)"],
      [1, "rgba(28,16,6,0)"],
    ]);
    expect(
      pic.calls.filter((c) => c.op === "fillRect").map((c) => c.alpha),
    ).toEqual([1, 0.8]);
    expect(calls.find((c) => c.op === "drawImage")!.args).toEqual([
      scratch,
      0,
      0,
      W,
      H,
      0,
      0,
      1,
      1,
    ]); // the picture is what goes in the place
  });

  it("lights a print still developing all over, its blank as well as the photo coming through", () => {
    const { ctx, calls } = fakeCtx(),
      pic = fakeCtx();
    const scratch = {
      width: 0,
      height: 0,
      getContext: () => pic.ctx,
    } as unknown as HTMLCanvasElement;
    const veil: PhotoOverlay = { color: "rgb(40,30,24)", alpha: 0.5 };
    paintPhotos(
      ctx,
      [place([[0, 0, 100, 100, 1, 0, 0.25]], "#ddd5c4")],
      0,
      [img(100, 100, "a")],
      { scratch },
    );
    expect(pic.calls).toHaveLength(0); // nothing lights it: drawn straight on, as before
    paintPhotos(
      ctx,
      [
        {
          blank: "#ddd5c4",
          overlay: [veil],
          boxes: [[0, 0, 100, 100, 1, 0, 0.25]],
        },
      ],
      0,
      [img(100, 100, "a")],
      { scratch },
    );
    const made = pic.calls.filter(
      (c) => c.op === "fillRect" || c.op === "drawImage",
    );
    expect(made.map((c) => [c.op, c.fill, c.alpha])).toEqual([
      ["fillRect", "#ddd5c4", 1], // the blank
      ["drawImage", undefined, 0.25], // the photo coming through
      ["fillRect", "rgb(40,30,24)", 0.5], // the veil over both
    ]);
    const onFilm = calls.slice(calls.findLastIndex((c) => c.op === "save"));
    expect(onFilm.filter((c) => c.op === "fillRect")).toHaveLength(0); // no second blank on the film
    expect(onFilm.find((c) => c.op === "drawImage")).toMatchObject({
      alpha: 1,
    });
  });

  it("keeps to the visible part when something in the film lies over the picture", () => {
    const { ctx, calls } = fakeCtx();
    paintPhotos(
      ctx,
      [place([{ ...Q, clip: [[100, 100, 200, 100, 200, 200, 100, 200]] }])],
      0,
      [img(100, 100, "a")],
    );
    const clip = calls.findIndex((c) => c.op === "clip");
    expect(calls[clip].args).toEqual(["evenodd"]);
    expect(calls.slice(0, clip).filter((c) => c.op === "lineTo")).toHaveLength(
      3,
    );
    expect(clip).toBeLessThan(calls.findIndex((c) => c.op === "drawImage"));
  });
});

describe("shuffled", () => {
  it("keeps every photo, in a new order each play", () => {
    const list = ["a", "b", "c", "d", "e"];
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const out = shuffled(list, random);
    expect([...out].sort()).toEqual(list);
    expect(out).not.toEqual(list);
    expect(list).toEqual(["a", "b", "c", "d", "e"]); // the card's own list is left as it was
  });
});

describe("the film painter with photos", () => {
  it("paints the photos under the words, as they come in", () => {
    const main = fakeCtx(),
      layer = fakeCtx();
    const slots: Slots = {
      width: 1280,
      height: 800,
      fps: 24,
      frames: 2,
      photos: [
        place([
          [10, 10, 100, 100],
          [10, 10, 100, 100],
        ]),
      ],
      slots: {
        cap: {
          kind: "label",
          boxes: [
            [0, 0, 300, 40],
            [0, 0, 300, 40],
          ],
        },
      },
    };
    const card = mergeCard({
      template: "developing-photos",
      slots: { cap: "Đà Lạt" },
    });
    const painter = createWordsPainter({
      canvas: {
        width: 1280,
        height: 800,
        getContext: () => main.ctx,
      } as unknown as HTMLCanvasElement,
      slots,
      card,
      fonts: null,
      makeCanvas: () =>
        ({
          width: 1280,
          height: 800,
          getContext: () => layer.ctx,
        }) as unknown as HTMLCanvasElement,
    });
    painter.draw(1);
    expect(main.calls.filter((c) => c.op === "drawImage")).toHaveLength(1); // the caption only: no photo yet, the film's own shows
    const before = main.calls.length;
    painter.setPhotos([img(100, 100, "mine")]); // it came in: the frame on screen again, with it
    const now = main.calls.slice(before).filter((c) => c.op === "drawImage");
    expect(now).toHaveLength(2); // the photo, then the caption's layer over it
    expect(now[0].args[0]).toMatchObject({ name: "mine" });
  });
});
