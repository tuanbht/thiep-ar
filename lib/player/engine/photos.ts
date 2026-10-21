/* The buyer's photos in a film. A film can have photo places (slots.json "photos"): where a picture shows, with a box
   for every frame it is in: a turned box, or four corners (a page in perspective), with how opaque and how developed it
   is, and the part of it nothing in the film lies over. The player lays the buyer's photos there, in a new order each
   play, over the film's own stand-in pictures, which show wherever no photo is given. A photo is cropped to its place,
   never stretched; a print that develops is its blank colour with the photo coming through. */
import type { PhotoBox, PhotoPlace, PhotoQuad } from './types';

/** A loaded photo: an image, or anything drawable with a size (a canvas in the tests). */
export type PhotoImage = CanvasImageSource & { width: number; height: number };

const DEFAULT_BLANK = '#ddd6c8';

/** The list in a new order (Fisher-Yates); the list itself is left as it was. */
export function shuffled<T>(list: readonly T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface PhotoLoad {
  /** every photo came in or failed, or `waitMs` went by: what a film waits for before it plays (a late one shows when
      it comes) */
  ready: Promise<void>;
}

export interface PhotoLoadOptions {
  /** one came in (they come in any order) */
  onPhoto(img: PhotoImage): void;
  waitMs?: number;
  /** kept at most this big on its longer side: ten full-size photos would fill a phone's memory */
  maxPx?: number;
}

/** Loads the photos at these links, handing each to `onPhoto` as it comes in; one that fails is left out. */
export function loadPhotos(urls: readonly string[], o: PhotoLoadOptions): PhotoLoad {
  const each = urls.map(url => new Promise<void>(done => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { o.onPhoto(smaller(img, o.maxPx ?? 960)); done(); };
    img.onerror = () => done();
    img.src = url;
  }));
  return { ready: Promise.race([Promise.all(each).then(() => undefined), new Promise<void>(r => setTimeout(r, o.waitMs ?? 2500))]) };
}

/** A big photo drawn smaller onto a canvas of its own. */
function smaller(img: HTMLImageElement, maxPx: number): PhotoImage {
  const k = Math.min(1, maxPx / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  if (k >= 1) return img;
  const cv = document.createElement('canvas');
  cv.width = Math.round((img.naturalWidth || img.width) * k); cv.height = Math.round((img.naturalHeight || img.height) * k);
  cv.getContext('2d')?.drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

/** Lays photo k into place k for this frame, wherever both exist. `layer`: a canvas to draw a place in perspective on
    first (the film's size; the words painter lends its own), so it is laid on at its opacity in one piece. */
export function paintPhotos(ctx: CanvasRenderingContext2D, places: readonly PhotoPlace[], frame: number, images: readonly (PhotoImage | null)[],
  layer?: HTMLCanvasElement): void {
  places.forEach((place, k) => {
    const img = images[k], box = place.boxes[frame];
    if (!img || !box) return;
    if (Array.isArray(box)) paintTurned(ctx, place, box, img);
    else paintQuad(ctx, place, box, img, layer);
  });
}

type Turned = Extract<PhotoBox, unknown[]>;
type Cornered = Extract<PhotoBox, { quad: PhotoQuad }>;

function paintTurned(ctx: CanvasRenderingContext2D, place: PhotoPlace, box: Turned, img: PhotoImage): void {
  const [x, y, w, h, alpha = 1, turn = 0, develop = 1] = box;
  if (alpha <= 0 || w <= 0 || h <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  if (turn) ctx.rotate(turn * Math.PI / 180);
  ctx.beginPath(); ctx.rect(-w / 2, -h / 2, w, h); ctx.clip();
  if (develop < 1) {                                                    // a print still developing: its blank first
    ctx.fillStyle = place.blank ?? DEFAULT_BLANK;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.globalAlpha = alpha * Math.max(0, develop);
  }
  const k2 = Math.max(w / img.width, h / img.height), dw = img.width * k2, dh = img.height * k2;   // cover: crop, never stretch
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

const PIECES = 8;                                                       // a place in perspective: an 8 x 8 grid of flat pieces

function paintQuad(ctx: CanvasRenderingContext2D, place: PhotoPlace, box: Cornered, img: PhotoImage, layer?: HTMLCanvasElement): void {
  const alpha = box.alpha ?? 1, develop = box.develop ?? 1, q = box.quad;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (box.clip?.length) { ctx.beginPath(); for (const poly of box.clip) trace(ctx, poly); ctx.clip('evenodd'); }
  if (develop < 1) {
    ctx.beginPath(); trace(ctx, q); ctx.fillStyle = place.blank ?? DEFAULT_BLANK; ctx.fill();
    ctx.globalAlpha = alpha * Math.max(0, develop);
  }
  const src = coverCrop(img, Math.hypot(q[2] - q[0], q[3] - q[1]) / Math.max(1e-6, Math.hypot(q[6] - q[0], q[7] - q[1])));
  if (isFlat(q)) {
    ctx.transform(q[2] - q[0], q[3] - q[1], q[6] - q[0], q[7] - q[1], q[0], q[1]);   // the unit square onto the place
    ctx.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, 1, 1);
  } else {
    inPerspective(ctx, img, src, q, layer);
  }
  ctx.restore();
}

/** A place in perspective: its pieces drawn opaque on the layer, then laid on in one piece at the context's opacity, so
    their overlapping edges never show (straight onto the film when there is no layer). */
function inPerspective(ctx: CanvasRenderingContext2D, img: PhotoImage, src: Crop, q: PhotoQuad, layer?: HTMLCanvasElement): void {
  const lc = layer?.getContext('2d');
  if (!layer || !lc) { drawInPieces(ctx, img, src, q); return; }
  const xs = [q[0], q[2], q[4], q[6]], ys = [q[1], q[3], q[5], q[7]];
  const x = Math.max(0, Math.floor(Math.min(...xs)) - 1), y = Math.max(0, Math.floor(Math.min(...ys)) - 1);
  const w = Math.min(layer.width, Math.ceil(Math.max(...xs)) + 1) - x, h = Math.min(layer.height, Math.ceil(Math.max(...ys)) + 1) - y;
  if (w <= 0 || h <= 0) return;
  lc.save();
  lc.clearRect(x, y, w, h);
  lc.globalAlpha = 1;
  drawInPieces(lc, img, src, q);
  lc.restore();
  ctx.drawImage(layer, x, y, w, h, x, y, w, h);
}

interface Crop { x: number; y: number; w: number; h: number }

/** The part of the photo that fills a place of this shape (width / height): its middle, at most the whole photo. */
function coverCrop(img: PhotoImage, shape: number): Crop {
  const w = Math.min(img.width, img.height * shape), h = w / shape;
  return { x: (img.width - w) / 2, y: (img.height - h) / 2, w, h };
}

/** A parallelogram: a flat place, turned or tilted, maps exactly with one transform. */
const isFlat = (q: PhotoQuad) => Math.abs(q[0] + q[4] - q[2] - q[6]) < .5 && Math.abs(q[1] + q[5] - q[3] - q[7]) < .5;

function trace(ctx: CanvasRenderingContext2D, poly: readonly number[]): void {
  ctx.moveTo(poly[0], poly[1]);
  for (let i = 2; i + 1 < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
  ctx.closePath();
}

/** A place in perspective: the photo drawn as a grid of triangles, each mapped flat onto its piece of the place. */
function drawInPieces(ctx: CanvasRenderingContext2D, img: PhotoImage, src: Crop, q: PhotoQuad): void {
  const at = (u: number, v: number): [number, number] => [
    (1 - u) * (1 - v) * q[0] + u * (1 - v) * q[2] + u * v * q[4] + (1 - u) * v * q[6],
    (1 - u) * (1 - v) * q[1] + u * (1 - v) * q[3] + u * v * q[5] + (1 - u) * v * q[7]
  ];
  const from = (u: number, v: number): [number, number] => [src.x + u * src.w, src.y + v * src.h];
  for (let i = 0; i < PIECES; i++) {
    for (let j = 0; j < PIECES; j++) {
      const [u0, u1, v0, v1] = [i / PIECES, (i + 1) / PIECES, j / PIECES, (j + 1) / PIECES];
      piece(ctx, img, [from(u0, v0), from(u1, v0), from(u1, v1)], [at(u0, v0), at(u1, v0), at(u1, v1)]);
      piece(ctx, img, [from(u0, v0), from(u1, v1), from(u0, v1)], [at(u0, v0), at(u1, v1), at(u0, v1)]);
    }
  }
}

type P = [number, number];

/** One triangle of the photo (s, in its pixels) onto one triangle of the place (d), clipped a hair wide so no seam shows. */
function piece(ctx: CanvasRenderingContext2D, img: PhotoImage, s: [P, P, P], d: [P, P, P]): void {
  const den = (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) - (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
  if (!den) return;
  const a = ((d[1][0] - d[0][0]) * (s[2][1] - s[0][1]) - (d[2][0] - d[0][0]) * (s[1][1] - s[0][1])) / den;
  const c = ((d[2][0] - d[0][0]) * (s[1][0] - s[0][0]) - (d[1][0] - d[0][0]) * (s[2][0] - s[0][0])) / den;
  const b = ((d[1][1] - d[0][1]) * (s[2][1] - s[0][1]) - (d[2][1] - d[0][1]) * (s[1][1] - s[0][1])) / den;
  const dd = ((d[2][1] - d[0][1]) * (s[1][0] - s[0][0]) - (d[1][1] - d[0][1]) * (s[2][0] - s[0][0])) / den;
  const e = d[0][0] - a * s[0][0] - c * s[0][1], f = d[0][1] - b * s[0][0] - dd * s[0][1];
  const cx = (d[0][0] + d[1][0] + d[2][0]) / 3, cy = (d[0][1] + d[1][1] + d[2][1]) / 3;
  const grow = (p: P): P => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l, p[1] + dy / l]; };
  ctx.save();
  ctx.beginPath(); trace(ctx, d.map(grow).flat()); ctx.clip();
  ctx.transform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
