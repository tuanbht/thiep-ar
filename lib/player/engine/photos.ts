/* The buyer's photos in a film. A film can have photo places (slots.json "photos"): where a picture shows, with a box
   for every frame it is in: a turned box, or four corners (a page in perspective), with how opaque and how developed it
   is, and the part of it nothing in the film lies over. The player lays the buyer's photos there, in a new order each
   play, over the film's own stand-in pictures, which show wherever no photo is given. A photo is cropped to the
   picture's own shape, never stretched; a print that develops is its blank colour with the photo coming through; the
   film's light on the picture (a page's shade as it turns, a poster's glare, a veil) is laid over the photo. */
import type { PhotoBox, PhotoOverlay, PhotoPlace, PhotoQuad } from "./types";

/** A loaded photo: an image, or anything drawable with a size (a canvas in the tests). */
export type PhotoImage = CanvasImageSource & { width: number; height: number };

const DEFAULT_BLANK = "#ddd6c8";
/** a photo with the film's light laid over it is drawn this big at most first */
const PICTURE_PX = 1024;

/** The list in a new order (Fisher-Yates); the list itself is left as it was. */
export function shuffled<T>(
  list: readonly T[],
  random: () => number = Math.random,
): T[] {
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
export function loadPhotos(
  urls: readonly string[],
  o: PhotoLoadOptions,
): PhotoLoad {
  const each = urls.map(
    (url) =>
      new Promise<void>((done) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          o.onPhoto(smaller(img, o.maxPx ?? 960));
          done();
        };
        img.onerror = () => done();
        img.src = url;
      }),
  );
  return {
    ready: Promise.race([
      Promise.all(each).then(() => undefined),
      new Promise<void>((r) => setTimeout(r, o.waitMs ?? 2500)),
    ]),
  };
}

/** A big photo drawn smaller onto a canvas of its own. */
function smaller(img: HTMLImageElement, maxPx: number): PhotoImage {
  const k = Math.min(
    1,
    maxPx /
      Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height),
  );
  if (k >= 1) return img;
  const cv = document.createElement("canvas");
  cv.width = Math.round((img.naturalWidth || img.width) * k);
  cv.height = Math.round((img.naturalHeight || img.height) * k);
  cv.getContext("2d")?.drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

/** Canvases the painter may draw on first. `layer` (the film's size): a place in perspective is drawn there in pieces,
    then laid on in one piece at its opacity, so no seams show. `scratch` (any size): a photo with the film's light laid
    over it. Without them, a place in perspective is drawn straight on, and the light is left out. */
export interface PhotoCanvases {
  layer?: HTMLCanvasElement;
  scratch?: HTMLCanvasElement;
}

/** Lays photo k into place k for this frame, wherever both exist. */
export function paintPhotos(
  ctx: CanvasRenderingContext2D,
  places: readonly PhotoPlace[],
  frame: number,
  images: readonly (PhotoImage | null)[],
  canvases: PhotoCanvases = {},
): void {
  places.forEach((place, k) => {
    const img = images[k],
      box = place.boxes[frame];
    if (!img || !box) return;
    const light = [
      ...(place.overlay ?? []),
      ...(!Array.isArray(box) && box.overlay ? box.overlay : []),
    ];
    if (Array.isArray(box)) paintTurned(ctx, place, box, img, light, canvases);
    else paintQuad(ctx, place, box, img, light, canvases);
  });
}

type Turned = Extract<PhotoBox, unknown[]>;
type Cornered = Extract<PhotoBox, { quad: PhotoQuad }>;
interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** what goes into a place: the part of the photo it shows; `whole` when the print's blank and the film's light are
    already in it (drawn on the scratch canvas) */
interface Picture {
  img: PhotoImage;
  src: Crop;
  whole: boolean;
}

function paintTurned(
  ctx: CanvasRenderingContext2D,
  place: PhotoPlace,
  box: Turned,
  img: PhotoImage,
  light: PhotoOverlay[],
  c: PhotoCanvases,
): void {
  const [x, y, w, h, alpha = 1, turn = 0, develop = 1] = box;
  if (alpha <= 0 || w <= 0 || h <= 0) return;
  const pic = picture(
    img,
    place.aspect ?? w / h,
    place,
    develop,
    light,
    c.scratch,
  );
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  if (turn) ctx.rotate((turn * Math.PI) / 180);
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.clip();
  if (develop < 1 && !pic.whole) {
    // a print still developing: its blank first
    ctx.fillStyle = place.blank ?? DEFAULT_BLANK;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.globalAlpha = alpha * Math.max(0, develop);
  }
  ctx.drawImage(
    pic.img,
    pic.src.x,
    pic.src.y,
    pic.src.w,
    pic.src.h,
    -w / 2,
    -h / 2,
    w,
    h,
  );
  ctx.restore();
}

const PIECES = 8; // a place in perspective: an 8 x 8 grid of flat pieces

function paintQuad(
  ctx: CanvasRenderingContext2D,
  place: PhotoPlace,
  box: Cornered,
  img: PhotoImage,
  light: PhotoOverlay[],
  c: PhotoCanvases,
): void {
  const alpha = box.alpha ?? 1,
    develop = box.develop ?? 1,
    q = box.quad;
  if (alpha <= 0) return;
  const seen =
    Math.hypot(q[2] - q[0], q[3] - q[1]) /
    Math.max(1e-6, Math.hypot(q[6] - q[0], q[7] - q[1]));
  const pic = picture(
    img,
    place.aspect ?? seen,
    place,
    develop,
    light,
    c.scratch,
  ); // its own shape: a turning page never zooms it
  ctx.save();
  ctx.globalAlpha = alpha;
  if (box.clip?.length) {
    ctx.beginPath();
    for (const poly of box.clip) trace(ctx, poly);
    ctx.clip("evenodd");
  }
  if (develop < 1 && !pic.whole) {
    ctx.beginPath();
    trace(ctx, q);
    ctx.fillStyle = place.blank ?? DEFAULT_BLANK;
    ctx.fill();
    ctx.globalAlpha = alpha * Math.max(0, develop);
  }
  if (isFlat(q)) {
    ctx.transform(
      q[2] - q[0],
      q[3] - q[1],
      q[6] - q[0],
      q[7] - q[1],
      q[0],
      q[1],
    ); // the unit square onto the place
    ctx.drawImage(
      pic.img,
      pic.src.x,
      pic.src.y,
      pic.src.w,
      pic.src.h,
      0,
      0,
      1,
      1,
    );
  } else {
    inPerspective(ctx, pic, q, c.layer);
  }
  ctx.restore();
}

/** The part of the photo a place of this shape (width / height) shows. With the film's light on it (and a scratch
    canvas), the whole picture is made there: the print's blank, the photo developing over it, then the light over both,
    as the film lights the print whether it has developed or not. */
function picture(
  img: PhotoImage,
  shape: number,
  place: PhotoPlace,
  develop: number,
  light: readonly PhotoOverlay[],
  scratch?: HTMLCanvasElement,
): Picture {
  const src = coverCrop(img, shape);
  const c = light.length ? scratch?.getContext("2d") : null;
  if (!scratch || !c) return { img, src, whole: false };
  const k = Math.min(1, PICTURE_PX / Math.max(src.w, src.h));
  const W = Math.max(1, Math.round(src.w * k)),
    H = Math.max(1, Math.round(src.h * k));
  if (scratch.width !== W || scratch.height !== H) {
    scratch.width = W;
    scratch.height = H;
  }
  c.save();
  c.globalAlpha = 1;
  c.clearRect(0, 0, W, H);
  if (develop < 1) {
    c.fillStyle = place.blank ?? DEFAULT_BLANK;
    c.fillRect(0, 0, W, H);
    c.globalAlpha = Math.max(0, develop);
  }
  c.drawImage(img, src.x, src.y, src.w, src.h, 0, 0, W, H);
  for (const o of light) lay(c, o, W, H);
  c.restore();
  return { img: scratch, src: { x: 0, y: 0, w: W, h: H }, whole: true };
}

/** One of the film's lights over the picture (W x H): a colour, or a gradient across it as it is oriented. A colour the
    canvas cannot read is left out rather than stopping the film. */
function lay(
  c: CanvasRenderingContext2D,
  o: PhotoOverlay,
  W: number,
  H: number,
): void {
  try {
    if ("color" in o) c.fillStyle = o.color;
    else {
      const g = c.createLinearGradient(
        o.from[0] * W,
        o.from[1] * H,
        o.to[0] * W,
        o.to[1] * H,
      );
      for (const [at, color] of o.stops)
        g.addColorStop(Math.min(1, Math.max(0, at)), color);
      c.fillStyle = g;
    }
  } catch {
    return;
  }
  c.globalAlpha = Math.min(1, Math.max(0, o.alpha ?? 1));
  c.fillRect(0, 0, W, H);
}

/** A place in perspective: its pieces drawn opaque on the layer, then laid on in one piece at the context's opacity, so
    their overlapping edges never show (straight onto the film when there is no layer). */
function inPerspective(
  ctx: CanvasRenderingContext2D,
  pic: Picture,
  q: PhotoQuad,
  layer?: HTMLCanvasElement,
): void {
  const lc = layer?.getContext("2d");
  if (!layer || !lc) {
    drawInPieces(ctx, pic, q);
    return;
  }
  const xs = [q[0], q[2], q[4], q[6]],
    ys = [q[1], q[3], q[5], q[7]];
  const x = Math.max(0, Math.floor(Math.min(...xs)) - 1),
    y = Math.max(0, Math.floor(Math.min(...ys)) - 1);
  const w = Math.min(layer.width, Math.ceil(Math.max(...xs)) + 1) - x,
    h = Math.min(layer.height, Math.ceil(Math.max(...ys)) + 1) - y;
  if (w <= 0 || h <= 0) return;
  lc.save();
  lc.clearRect(x, y, w, h);
  lc.globalAlpha = 1;
  drawInPieces(lc, pic, q);
  lc.restore();
  ctx.drawImage(layer, x, y, w, h, x, y, w, h);
}

/** The part of the photo that fills a place of this shape (width / height): its middle, at most the whole photo. */
function coverCrop(img: PhotoImage, shape: number): Crop {
  const w = Math.min(img.width, img.height * shape),
    h = w / shape;
  return { x: (img.width - w) / 2, y: (img.height - h) / 2, w, h };
}

/** A parallelogram: a flat place, turned or tilted, maps exactly with one transform. */
const isFlat = (q: PhotoQuad) =>
  Math.abs(q[0] + q[4] - q[2] - q[6]) < 0.5 &&
  Math.abs(q[1] + q[5] - q[3] - q[7]) < 0.5;

function trace(ctx: CanvasRenderingContext2D, poly: readonly number[]): void {
  ctx.moveTo(poly[0], poly[1]);
  for (let i = 2; i + 1 < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]);
  ctx.closePath();
}

/** The projective map of the unit square onto a place's four corners (Heckbert): a b c d e f g h, where a point (u, v)
    of the picture lands at ((a u + b v + c) / w, (d u + e v + f) / w), w = g u + h v + 1. */
type Projective = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function projectiveOf(q: PhotoQuad): Projective {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const sx = x0 - x1 + x2 - x3,
    sy = y0 - y1 + y2 - y3;
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9)
    return [x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0];
  const dx1 = x1 - x2,
    dx2 = x3 - x2,
    dy1 = y1 - y2,
    dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den,
    h = (dx1 * sy - sx * dy1) / den;
  return [
    x1 - x0 + g * x1,
    x3 - x0 + h * x3,
    x0,
    y1 - y0 + g * y1,
    y3 - y0 + h * y3,
    y0,
    g,
    h,
  ];
}

function project(
  [a, b, c, d, e, f, g, h]: Projective,
  u: number,
  v: number,
): [number, number] {
  const w = g * u + h * v + 1 || 1e-9;
  return [(a * u + b * v + c) / w, (d * u + e * v + f) / w];
}

/** Where the point (u, v) of the picture (0 to 1 across and down, as it is oriented) lands in a place given by its four
    corners: true perspective, so the middle of a page seen at an angle is where its diagonals cross. */
export const quadPoint = (
  q: PhotoQuad,
  u: number,
  v: number,
): [number, number] => project(projectiveOf(q), u, v);

/** A place in perspective: the picture drawn as a grid of triangles, each mapped flat onto its piece of the place, the
    grid's points where perspective puts them. */
function drawInPieces(
  ctx: CanvasRenderingContext2D,
  pic: Picture,
  q: PhotoQuad,
): void {
  const m = projectiveOf(q),
    src = pic.src;
  const at = (u: number, v: number) => project(m, u, v);
  const from = (u: number, v: number): [number, number] => [
    src.x + u * src.w,
    src.y + v * src.h,
  ];
  for (let i = 0; i < PIECES; i++) {
    for (let j = 0; j < PIECES; j++) {
      const [u0, u1, v0, v1] = [
        i / PIECES,
        (i + 1) / PIECES,
        j / PIECES,
        (j + 1) / PIECES,
      ];
      piece(
        ctx,
        pic.img,
        [from(u0, v0), from(u1, v0), from(u1, v1)],
        [at(u0, v0), at(u1, v0), at(u1, v1)],
      );
      piece(
        ctx,
        pic.img,
        [from(u0, v0), from(u1, v1), from(u0, v1)],
        [at(u0, v0), at(u1, v1), at(u0, v1)],
      );
    }
  }
}

type P = [number, number];

/** One triangle of the picture (s, in its pixels) onto one triangle of the place (d), clipped a pixel wide so no seam
    shows. */
function piece(
  ctx: CanvasRenderingContext2D,
  img: PhotoImage,
  s: [P, P, P],
  d: [P, P, P],
): void {
  const den =
    (s[1][0] - s[0][0]) * (s[2][1] - s[0][1]) -
    (s[2][0] - s[0][0]) * (s[1][1] - s[0][1]);
  if (!den) return;
  const a =
    ((d[1][0] - d[0][0]) * (s[2][1] - s[0][1]) -
      (d[2][0] - d[0][0]) * (s[1][1] - s[0][1])) /
    den;
  const c =
    ((d[2][0] - d[0][0]) * (s[1][0] - s[0][0]) -
      (d[1][0] - d[0][0]) * (s[2][0] - s[0][0])) /
    den;
  const b =
    ((d[1][1] - d[0][1]) * (s[2][1] - s[0][1]) -
      (d[2][1] - d[0][1]) * (s[1][1] - s[0][1])) /
    den;
  const dd =
    ((d[2][1] - d[0][1]) * (s[1][0] - s[0][0]) -
      (d[1][1] - d[0][1]) * (s[2][0] - s[0][0])) /
    den;
  const e = d[0][0] - a * s[0][0] - c * s[0][1],
    f = d[0][1] - b * s[0][0] - dd * s[0][1];
  const cx = (d[0][0] + d[1][0] + d[2][0]) / 3,
    cy = (d[0][1] + d[1][1] + d[2][1]) / 3;
  const grow = (p: P): P => {
    const dx = p[0] - cx,
      dy = p[1] - cy,
      l = Math.hypot(dx, dy) || 1;
    return [p[0] + dx / l, p[1] + dy / l];
  };
  ctx.save();
  ctx.beginPath();
  trace(ctx, d.map(grow).flat());
  ctx.clip();
  ctx.transform(a, b, c, dd, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
