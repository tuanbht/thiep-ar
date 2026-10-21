/* The words on the road: a film template's boards, signs and labels, painted onto a canvas at the board's place for
   the frame the film is on (templates/<id>/slots.json says where each slot is in every frame). The canvas is laid over
   the film on the card. A port of the old player's painter, which scenes/check-card.py measures:
   - the card is read live, at each paint (the page shows it as window.__card and the tool swaps its slots);
   - draw(-1) forgets the last frame, so the next draw(f) paints again. */
import type { Card } from "../core/card";
import { paintPhotos, type PhotoImage } from "./photos";
import type { Slot, SlotStyle, Slots } from "./types";

type Style = Partial<SlotStyle>;
type Ctx = CanvasRenderingContext2D;

export interface WordsPainterOptions {
  /** the words' canvas: slots.width x slots.height */
  canvas: HTMLCanvasElement;
  slots: Slots | null;
  /** read at every paint, never copied */
  card: Card;
  /** after each paint (a texture of the canvas needs an upload) */
  onPainted?(): void;
  /** the frame the film shows now: a face that comes in late paints it again */
  frameNow?(): number;
  /** faces start loading once this settles (a template's fonts stylesheet) */
  after?: Promise<unknown>;
  /** how long the first paint may wait for the faces, in ms (default 2500) */
  facesWait?: number;
  /** the page's faces (default document.fonts; null for none) */
  fonts?: FontFaceSet | null;
  /** makes the off-screen layer each slot is drawn on whole (default a new <canvas>) */
  makeCanvas?(width: number, height: number): HTMLCanvasElement;
}

export interface WordsPainter {
  /** paint the card's words for a film frame; -1 clears and forgets, so the next frame paints again */
  draw(frame: number): void;
  /** the film frame at a time, in seconds */
  frameAt(seconds: number): number;
  /** every face the card's words need is in, or the wait ran out */
  facesReady: Promise<void>;
  /** the card's photos, in the order the film's photo places take them (slots.photos), null where one is not in: the
      frame on screen is painted again with them */
  setPhotos(list: (PhotoImage | null)[]): void;
  dispose(): void;
}

const signFamily = (slots: Slots | null): string =>
  `"${(slots && slots.font) || "Barlow Condensed"}", "Arial Narrow", "Roboto Condensed", sans-serif`;

/** The built-in looks; a slot's own "style" overrides any of these fields. */
export function kindsFor(slots: Slots | null): Record<string, Style> {
  const SIGN_FONT = signFamily(slots);
  return {
    sign: {
      family: SIGN_FONT,
      weight: 700,
      color: "#f4ecd8",
      align: "left",
      valign: "top",
      lines: 2,
      upper: true,
      lineHeight: 1.02,
    },
    label: {
      family: SIGN_FONT,
      weight: 700,
      color: "#3a4a63",
      align: "center",
      valign: "middle",
      lines: 1,
      upper: true,
      lineHeight: 1,
    },
    caption: {
      family: '"Newsreader", Georgia, serif',
      weight: 400,
      italic: true,
      color: "#f3ece2",
      align: "center",
      valign: "middle",
      lines: 3,
      upper: false,
      lineHeight: 1.3,
    },
    text: {
      family: SIGN_FONT,
      weight: 400,
      color: "#f4ecd8",
      align: "left",
      valign: "top",
      lines: 3,
      upper: false,
      lineHeight: 1.25,
    },
  };
}

export const fontOf = (st: Style, size: number): string =>
  `${st.italic ? "italic " : ""}${st.weight || 400} ${size.toFixed(1)}px ${st.family}`;

/** This card's words for a slot: the slot's fixed text, else the card's, else (Night Mail only) its older signs and mailbox. */
export function textOf(
  card: Card,
  name: string,
  slot: Slot,
  st: Style,
): string {
  const legacy = card.template === "night-mail";
  const own = card.slots ? card.slots[name] : undefined;
  const t =
    slot.text != null
      ? slot.text
      : own != null
        ? own
        : legacy && name.startsWith("sign")
          ? (card.signs || [])[+name.slice(4)] || ""
          : legacy && name === "mailbox"
            ? card.mailbox
            : "";
  const s = String(t).trim();
  return st.upper ? s.toUpperCase() : s;
}

/** Break into at most `lines` lines that fit maxW; null if it cannot. */
export function wrap(
  ctx: Ctx,
  text: string,
  maxW: number,
  lines: number,
): string[] | null {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width <= maxW) line = t;
    else {
      if (!line || out.length === lines - 1) return null;
      out.push(line);
      line = w;
      if (ctx.measureText(w).width > maxW) return null;
    }
  }
  out.push(line);
  return out;
}

/** The card's own line breaks kept, each part wrapped too if it is long; null if they need more lines. */
export function wrapGiven(
  ctx: Ctx,
  paras: string[],
  maxW: number,
  lines: number,
): string[] | null {
  const out: string[] = [];
  for (let i = 0; i < paras.length; i++) {
    const room = lines - out.length - (paras.length - 1 - i);
    const part = room > 0 ? wrap(ctx, paras[i], maxW, room) : null;
    if (!part) return null;
    out.push(...part);
  }
  return out;
}

/** The narrowest width that still needs no more lines, so the lines come out even. */
export function balance(
  ctx: Ctx,
  text: string,
  lines: string[],
  maxW: number,
): string[] {
  if (lines.length < 2) return lines;
  let lo = 0,
    hi = maxW,
    best = lines;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2,
      t = wrap(ctx, text, mid, lines.length);
    if (t) {
      best = t;
      hi = mid;
    } else lo = mid;
  }
  return best;
}

const settleWithin = (p: Promise<unknown>, ms: number): Promise<void> =>
  Promise.race([
    p.then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((r) => setTimeout(r, Math.max(0, ms))),
  ]);

export function createWordsPainter(o: WordsPainterOptions): WordsPainter {
  const { canvas, slots, card } = o;
  const SW = slots ? slots.width : canvas.width,
    SH = slots ? slots.height : canvas.height;
  const FPS = slots ? slots.fps : 24;
  const wctx = canvas.getContext("2d");
  const layer = o.makeCanvas
    ? o.makeCanvas(SW, SH)
    : Object.assign(document.createElement("canvas"), {
        width: SW,
        height: SH,
      });
  const tctx = layer.getContext("2d"); // each slot is drawn here whole, then laid on at its alpha: a fade dims it as one piece, as CSS opacity does
  const KINDS = kindsFor(slots);
  const styleOf = (slot: Slot): Style => ({
    ...(KINDS[slot.kind ?? ""] || KINDS.text),
    ...(slot.style || {}),
  });
  const fonts =
    o.fonts === undefined
      ? typeof document !== "undefined"
        ? document.fonts
        : null
      : o.fonts;
  let lastWords = -1,
    disposed = false;
  let images: (PhotoImage | null)[] = [];

  const frameAt = (t: number): number =>
    Math.max(0, Math.min((slots ? slots.frames : 1) - 1, Math.round(t * FPS)));

  function paintSlot(name: string, slot: Slot, frame: number): void {
    if (!wctx || !tctx) return;
    const box = slot.boxes[frame];
    if (!box) return;
    const [x, y, w, h, alpha = 1] = box;
    if (alpha <= 0) return;
    const st = styleOf(slot);
    const text = textOf(card, name, slot, st);
    if (!text) return;
    const want = st.lines || 1,
      lh = st.lineHeight || 1.1;
    const paras = text
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
      flat = paras.join(" ");
    const given = paras.length > 1 && paras.length <= want; // the card's own line breaks, when the box has room for them; otherwise the words run on
    let size = st.size || h / want / lh,
      lines: string[] | null = null;
    for (let i = 0; i < 12 && !lines; i++) {
      tctx.font = fontOf(st, size);
      tctx.letterSpacing = st.letterSpacing
        ? `${(st.letterSpacing * size).toFixed(2)}px`
        : "0px"; // in em; ignored where canvas has no letterSpacing
      lines = given
        ? wrapGiven(tctx, paras, w, want)
        : wrap(tctx, flat, w, want);
      if (lines && st.balance && !given) lines = balance(tctx, flat, lines, w);
      if (!lines) size *= 0.86;
    }
    const out = lines || [flat];
    const m = Math.ceil(size * 0.8),
      rx = Math.max(0, Math.floor(x - m)),
      ry = Math.max(0, Math.floor(y - m)); // the box with room for glow and outline
    const rw = Math.min(SW, Math.ceil(x + w + m)) - rx,
      rh = Math.min(SH, Math.ceil(y + h + m)) - ry;
    if (rw <= 0 || rh <= 0) return;
    tctx.clearRect(rx, ry, rw, rh);
    tctx.fillStyle = tctx.strokeStyle = st.color || "#fff";
    tctx.textAlign = st.align || "left";
    tctx.textBaseline = "top";
    tctx.lineJoin = "round";
    tctx.lineWidth = (st.stroke || 0) * size; // stroke: an outline in the text colour, in em, to give a thin face more weight
    if (st.shadow) {
      tctx.shadowColor = st.shadow;
      tctx.shadowBlur = size * 0.25;
    } else tctx.shadowBlur = 0;
    const tx =
      st.align === "center" ? x + w / 2 : st.align === "right" ? x + w : x;
    const block = out.length * size * lh,
      ty =
        st.valign === "middle"
          ? y + (h - block) / 2
          : st.valign === "bottom"
            ? y + h - block
            : y;
    out.forEach((ln, i) => {
      const ly = ty + i * size * lh + (size * (lh - 1)) / 2,
        mw = st.align === "center" ? w * 1.05 : undefined;
      if (st.stroke) tctx.strokeText(ln, tx, ly, mw);
      tctx.fillText(ln, tx, ly, mw);
    });
    tctx.shadowBlur = 0;
    tctx.letterSpacing = "0px";
    wctx.globalAlpha = alpha;
    wctx.drawImage(layer, rx, ry, rw, rh, rx, ry, rw, rh);
    wctx.globalAlpha = 1;
  }

  function draw(frame: number): void {
    if (disposed || !slots || !wctx || frame === lastWords) return;
    lastWords = frame;
    wctx.clearRect(0, 0, SW, SH);
    if (slots.photos?.length && images.length)
      paintPhotos(wctx, slots.photos, frame, images, layer); // under the words written on them
    for (const [name, slot] of Object.entries(slots.slots))
      paintSlot(name, slot, frame);
    o.onPainted?.();
  }

  const loadFaces = (): Promise<unknown> => {
    // every face with this card's own words, so all the glyphs it needs (Vietnamese too) are in before the first frame
    if (!fonts || !slots) return Promise.resolve();
    try {
      const faces: Promise<unknown>[] = [
        fonts.load(`700 40px ${signFamily(slots)}`),
      ];
      for (const [name, slot] of Object.entries(slots.slots)) {
        const st = styleOf(slot),
          t = textOf(card, name, slot, st);
        if (t) faces.push(fonts.load(fontOf(st, 40), t));
      }
      return Promise.allSettled(faces);
    } catch {
      return Promise.resolve();
    }
  };
  const facesWait = o.facesWait ?? 2500;
  const facesReady = settleWithin(
    (o.after ?? Promise.resolve()).then(loadFaces, loadFaces),
    facesWait,
  );

  const onLoadingDone = (): void => {
    // a face that came in after the wait: paint the frame again with it
    if (disposed || (lastWords < 0 && !o.frameNow)) return;
    const f = o.frameNow ? o.frameNow() : lastWords;
    lastWords = -1;
    draw(f);
  };
  fonts?.addEventListener?.("loadingdone", onLoadingDone);
  return {
    draw,
    frameAt,
    facesReady,
    setPhotos(list) {
      images = [...list];
      onLoadingDone();
    },
    dispose() {
      disposed = true;
      fonts?.removeEventListener?.("loadingdone", onLoadingDone);
    },
  };
}
