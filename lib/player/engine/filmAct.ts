/* A film template on the card (Night Mail and the twelve scenes): the film plays on the printed card, the card's words
   are painted over it at each board's place, and after the reveal chapter an envelope rises off the card with the
   greeting (and the photo beside it). The film stops at each chapter's end second and waits there for a tap.
   Built on the card frame (x across, y up the card, z out of it, 1 = the card's width). */
import * as THREE from "three";
import { loadPhotos, shuffled, type PhotoImage } from "./photos";
import { createWordsPainter } from "./words";
import type { FilmAct, FilmActOptions } from "./types";

const ENV_DOWN = new THREE.Vector3(0, 0.08, 0.02);
const ENV_UP = new THREE.Vector3(0, 0.46, 0.22);
const HIDDEN = 0.001;
const SPIN_MS = 9000;
const FACES_WAIT = 2500,
  META_WAIT = 4000;
const PHOTOS_WAIT = 6000; // the film starts without a photo slower than this (it shows when it comes)

const easeOutBack = (t: number): number => {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

interface Tween {
  t0: number;
  ms: number;
  from: number;
  to: number;
  ease(t: number): number;
  set(v: number): void;
}

/** The template's own faces (template.json "fonts": a stylesheet), loaded once; settles when it loads or fails. */
function loadFontsSheet(
  href: string | undefined,
  tdir: string,
): Promise<unknown> {
  if (!href || typeof document === "undefined") return Promise.resolve();
  let url: URL;
  try {
    url = new URL(href, new URL(`${tdir}/`, location.href));
  } catch {
    return Promise.resolve();
  }
  if (!/^https?:$/.test(url.protocol)) return Promise.resolve();
  if (
    [
      ...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    ].some((l) => l.href === url.href)
  )
    return Promise.resolve();
  return new Promise((resolve) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = url.href;
    css.onload = css.onerror = () => resolve(undefined);
    document.head.appendChild(css);
  });
}

/** A line of text on a transparent plane, `w` x `h` card widths, shrunk to fit its width. */
function textPlane(
  text: string,
  color: string,
  w: number,
  h: number,
  capH: number,
  owned: { dispose(): void }[],
): THREE.Mesh {
  const PX = 1024 / w,
    cv = document.createElement("canvas");
  cv.width = 1024;
  cv.height = Math.max(8, Math.round(h * PX));
  const c = cv.getContext("2d");
  if (c && text) {
    let size = (capH / 0.7) * PX; // a cap height of capH card widths
    const face = (s: number) =>
      `500 ${s.toFixed(1)}px Roboto, "Helvetica Neue", Arial, sans-serif`;
    c.font = face(size);
    const room = cv.width * 0.96,
      width = c.measureText(text).width;
    if (width > room) {
      size *= room / width;
      c.font = face(size);
    }
    c.fillStyle = color;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(text, cv.width / 2, cv.height / 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  });
  const geo = new THREE.PlaneGeometry(w, h);
  owned.push(tex, mat, geo);
  return new THREE.Mesh(geo, mat);
}

export function createFilmAct(o: FilmActOptions): FilmAct {
  const { card, tpl, tdir, slots, chapters, host } = o;
  const aspect = tpl.aspect;
  const owned: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T): T => {
    owned.push(x);
    return x;
  };
  const reduced =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── the media, in the page (tools find #film and #words by id) ── */
  const media = document.createElement("div");
  media.className = "film-act-media";
  media.setAttribute("aria-hidden", "true");
  Object.assign(media.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    opacity: "0",
    pointerEvents: "none",
  });
  const video = document.createElement("video");
  video.id = "film";
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  ["muted", "playsinline", "webkit-playsinline"].forEach((a) =>
    video.setAttribute(a, ""),
  );
  const sources = [
    ["mp4", "video/mp4"],
    ["webm", "video/webm"],
  ].map(([ext, type]) => {
    const s = document.createElement("source");
    s.src = `${tdir}/film.${ext}`;
    s.type = type;
    video.appendChild(s);
    return s;
  });
  const canvas = document.createElement("canvas");
  canvas.id = "words";
  canvas.width = slots ? slots.width : 1280;
  canvas.height = slots ? slots.height : 800;
  media.append(video, canvas);
  o.domRoot.appendChild(media);

  /* ── on the card: the film, and the words over it ── */
  const card3d = new THREE.Group();
  card3d.name = "film-act";
  host.add(card3d);
  const videoTex = keep(new THREE.VideoTexture(video));
  videoTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(1, aspect)),
    keep(new THREE.MeshBasicMaterial({ map: videoTex, toneMapped: false })),
  );
  screen.position.z = 0.001;
  const wordsTex = keep(new THREE.CanvasTexture(canvas));
  wordsTex.colorSpace = THREE.SRGBColorSpace;
  const overlay = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(1, aspect)),
    keep(
      new THREE.MeshBasicMaterial({
        map: wordsTex,
        transparent: true,
        alphaTest: 0.01,
        toneMapped: false,
      }),
    ),
  );
  overlay.position.z = 0.002;
  card3d.add(screen, overlay);

  /* the frame on screen: the browser says which frame it presented (requestVideoFrameCallback), and the words and photos
     are painted for that one, never for the frame a moment ahead that currentTime may already name */
  let shownAt: number | null = null,
    frameCallback = 0;
  const painter = createWordsPainter({
    canvas,
    slots,
    card,
    onPainted: () => {
      wordsTex.needsUpdate = true;
    },
    frameNow: () => painter.frameAt(shownAt ?? video.currentTime),
    after: Promise.race([
      loadFontsSheet(tpl.fonts, tdir),
      new Promise((r) => setTimeout(r, FACES_WAIT)),
    ]),
    facesWait: FACES_WAIT,
  });

  /* ── the buyer's photos in the film's photo places: in a new order each play; one that comes in late takes the next
     free place, so a photo never jumps from one place to another while the film plays ── */
  const places = slots?.photos?.length ?? 0;
  let photosIn: PhotoImage[] = [],
    order: PhotoImage[] = [];
  const placePhotos = (): void => painter.setPhotos(order.slice(0, places));
  const photosReady =
    places && card.photos.length
      ? loadPhotos(shuffled(card.photos), {
          waitMs: PHOTOS_WAIT,
          onPhoto: (img) => {
            if (disposed) return;
            photosIn = [...photosIn, img];
            order = [...order, img];
            placePhotos();
          },
        }).ready
      : Promise.resolve();

  /* ── the envelope that rises off the card after the reveal chapter (lit as the old A-Frame scene lit it) ── */
  const lights = new THREE.Group();
  lights.name = "film-act-lights";
  const ambient = new THREE.AmbientLight(0xbbbbbb, Math.PI); // A-Frame's default lights, in today's physical units
  const sun = new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI);
  sun.position.set(-0.5, 1, 1);
  lights.add(ambient, sun, sun.target);
  card3d.add(lights);
  const standard = (color: string, side: THREE.Side = THREE.FrontSide) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0,
        side,
        toneMapped: false,
      }),
    );
  const env = new THREE.Group();
  env.name = "envelope";
  env.position.copy(ENV_DOWN);
  env.scale.setScalar(HIDDEN);
  env.visible = false;
  const spinner = new THREE.Group();
  env.add(spinner);
  spinner.add(
    new THREE.Mesh(
      keep(new THREE.BoxGeometry(0.36, 0.23, 0.012)),
      standard("#efe3c8"),
    ),
  );
  const flapGeo = keep(new THREE.BufferGeometry());
  flapGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-0.18, 0.115, 0.0065, 0.18, 0.115, 0.0065, 0, -0.01, 0.0065],
      3,
    ),
  );
  flapGeo.computeVertexNormals();
  spinner.add(new THREE.Mesh(flapGeo, standard("#e6d7b6", THREE.DoubleSide))); // the flap's points run clockwise: both sides, so it shows from the front
  const seal = new THREE.Mesh(
    keep(new THREE.SphereGeometry(0.028, 24, 16)),
    standard("#c8372d"),
  );
  seal.position.set(0, -0.01, 0.012);
  spinner.add(seal);
  const sealText = textPlane(card.seal, "#ffd9c9", 0.07, 0.035, 0.016, owned);
  sealText.position.set(0, -0.012, 0.041);
  spinner.add(sealText);
  const back = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(0.36, 0.23)),
    standard("#d8c7a3"),
  );
  back.position.z = -0.0065;
  back.rotation.y = Math.PI;
  spinner.add(back);
  const greeting = textPlane(card.greeting, "#f4ecd8", 1.1, 0.12, 0.035, owned);
  greeting.position.set(0, 0.2, 0);
  env.add(greeting);
  if (card.photo) {
    // a photo floats beside the envelope when it rises
    const photoMat = keep(
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        toneMapped: false,
      }),
    );
    const photo = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(0.34, 0.26)),
      photoMat,
    );
    photo.position.set(-0.42, 0.02, 0);
    photo.rotation.y = THREE.MathUtils.degToRad(18);
    photo.visible = false;
    env.add(photo);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      card.photo,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        keep(tex);
        photoMat.map = tex;
        photoMat.needsUpdate = true;
        photo.visible = true;
      },
      undefined,
      () => {
        /* no photo: the envelope rises alone */
      },
    );
  }
  card3d.add(env);

  let tweens: Tween[] = [];
  const tween = (
    ms: number,
    from: number,
    to: number,
    ease: Tween["ease"],
    set: Tween["set"],
  ) => tweens.push({ t0: performance.now(), ms, from, to, ease, set });
  function reveal(): void {
    tweens = [];
    env.visible = true;
    const s0 = env.scale.x,
      y0 = env.position.y,
      z0 = env.position.z;
    tween(900, s0, 1, easeOutBack, (v) =>
      env.scale.setScalar(Math.max(HIDDEN, v)),
    );
    tween(1400, 0, 1, easeOutCubic, (k) =>
      env.position.set(0, y0 + (ENV_UP.y - y0) * k, z0 + (ENV_UP.z - z0) * k),
    );
  }
  function hide(): void {
    tweens = [];
    env.scale.setScalar(HIDDEN);
    env.position.copy(ENV_DOWN);
    env.visible = false;
  }

  /* ── playing: from the chapter's start to its end second, then wait for a tap ── */
  let chapter = -1,
    playing = false,
    raf = 0,
    disposed = false;
  const stopWatch = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  /** follows the frames the browser presents while the film plays (where it can tell) */
  const followFrames = (): void => {
    if (typeof video.requestVideoFrameCallback !== "function") return;
    if (frameCallback) video.cancelVideoFrameCallback(frameCallback);
    const onFrame: VideoFrameRequestCallback = (_now, meta) => {
      shownAt = meta.mediaTime;
      frameCallback =
        playing && !disposed ? video.requestVideoFrameCallback(onFrame) : 0;
    };
    frameCallback = video.requestVideoFrameCallback(onFrame);
  };
  /** the film was moved to a time: until the browser presents a frame there, the time is all there is to go by */
  const seek = (t: number): void => {
    video.currentTime = t;
    shownAt = null;
  };
  function watch(): void {
    raf = 0;
    if (!playing || disposed || chapter < 0) return;
    painter.draw(painter.frameAt(shownAt ?? video.currentTime));
    const c = chapters[chapter],
      end = c.end;
    if (video.currentTime >= end - 0.02) {
      video.pause();
      seek(end);
      painter.draw(painter.frameAt(end));
      playing = false;
      if (c.reveal) {
        reveal();
        o.onReveal?.(true);
      }
      o.onStop(chapter);
      return;
    }
    raf = requestAnimationFrame(watch);
  }
  const startWatch = () => {
    stopWatch();
    raf = requestAnimationFrame(watch);
  };
  const playVideo = () => {
    const p = video.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  };

  const metadata = new Promise<void>((resolve) => {
    if (video.readyState >= 1) return resolve();
    const done = () => resolve();
    video.addEventListener("loadedmetadata", done, { once: true });
    video.addEventListener("error", done, { once: true });
    sources[sources.length - 1].addEventListener("error", done, { once: true }); // every source failed
    setTimeout(done, META_WAIT);
  });
  const ready = Promise.all([painter.facesReady, photosReady, metadata]);
  painter.facesReady.then(() => {
    if (!disposed && chapter < 0) painter.draw(0);
  }); // the first frame's words, before anything plays

  return {
    kind: "film",
    video,
    ready,
    drawWords: (f) => painter.draw(f),
    async unlock() {
      // iOS: video may only start inside a tap
      try {
        await video.play();
        video.pause();
        video.currentTime = 0;
      } catch {
        /* it starts with the first chapter's tap instead */
      }
    },
    play(i: number) {
      if (disposed || !chapters[i]) return;
      if (i === 0 && chapter >= 0 && photosIn.length > 1) {
        order = shuffled(photosIn);
        placePhotos();
      } // played again: a new order
      chapter = i;
      playing = true;
      if (i === 0) {
        hide();
        o.onReveal?.(false);
      }
      seek(i ? chapters[i - 1].end : 0);
      painter.draw(painter.frameAt(video.currentTime));
      playVideo();
      followFrames();
      startWatch();
    },
    pause() {
      video.pause();
      stopWatch();
    },
    resume() {
      if (!playing || disposed) return;
      playVideo();
      followFrames();
      startWatch();
    },
    kick() {
      if (playing && video.paused) playVideo();
    },
    update(_dt: number, now: number) {
      if (!reduced)
        spinner.rotation.y = ((now % SPIN_MS) / SPIN_MS) * Math.PI * 2; // one turn every 9 s, as before; still for reduced motion
      if (!tweens.length) return;
      tweens = tweens.filter((t) => {
        const k = Math.min(1, Math.max(0, (now - t.t0) / t.ms));
        t.set(t.from + (t.to - t.from) * t.ease(k));
        return k < 1;
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      playing = false;
      stopWatch();
      if (frameCallback) video.cancelVideoFrameCallback?.(frameCallback);
      tweens = [];
      painter.dispose();
      try {
        video.pause();
      } catch {
        /* already gone */
      }
      sources.forEach((s) => s.remove());
      video.removeAttribute("src");
      try {
        video.load();
      } catch {
        /* jsdom */
      }
      media.remove();
      host.remove(card3d);
      ambient.dispose();
      sun.dispose();
      owned.forEach((x) => x.dispose());
    },
  };
}
