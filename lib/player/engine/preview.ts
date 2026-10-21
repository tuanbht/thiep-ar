/* The preview: no camera. The card floats in front of the fixed camera and a finger (or the mouse) turns it to any
   side, the wheel or a pinch brings it nearer. A 3D act stands up along +z of the card and faces -y; the view turns
   the card by R = Rx(elevation - 90deg) . Rz(azimuth) and puts the point PIVOT up its normal at (0, 0, -distance), so
   at azimuth 0 the act faces the camera. A film card faces the camera and only tilts (within 35 degrees). */
import * as THREE from "three";

export interface View {
  azimuth: number;
  elevation: number;
  distance: number;
  lift: number;
}

const RAD = Math.PI / 180;

/** Where a 3D act is first seen from. A screen held upright sees far up and down, so the act comes close, near eye
    level, and fills it; a wide one sees only 45 degrees up and down, so it stands back a little, higher, and a tall act
    (a heart of lanterns, a moon) keeps its top in view. */
export const firstView3d = ({
  width,
  height,
}: {
  width: number;
  height: number;
}): { elevation: number; distance: number } =>
  height >= width
    ? { elevation: 26, distance: 1.4 }
    : { elevation: 32, distance: 1.7 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const round = (x: number) => Math.round(x * 100) / 100;

export class PreviewView {
  readonly view: View;
  turntable = false;
  /** a finger or the mouse is on it: the turntable waits */
  held = false;
  private tween: { from: View; to: View; t0: number; ms: number } | null = null;
  private sway = 1;
  private readonly limits: {
    az?: [number, number];
    el: [number, number];
    d: [number, number];
  };
  private readonly pivot: number;
  private readonly reduced =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  private readonly M = new THREE.Matrix4();
  private readonly R = new THREE.Matrix4();
  private readonly P = new THREE.Vector3();

  /** onMoved: a tween ended or the turntable moved it. size: the box the view fills (the screen, or a panel) */
  constructor(
    private readonly kind: "film" | "3d",
    private readonly aspect: number,
    private readonly onMoved: () => void,
    private readonly size: () => { width: number; height: number } = () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }),
    pivot = 0.28,
  ) {
    this.limits =
      kind === "3d"
        ? { el: [4, 88], d: [0.9, 3.5] }
        : { az: [-35, 35], el: [55, 125], d: [0.6, 3.5] };
    this.pivot = kind === "3d" ? pivot : 0;
    this.view = {
      azimuth: 0,
      ...(kind === "3d"
        ? firstView3d(this.size())
        : { elevation: 90, distance: this.fit(0.5, aspect / 2) }),
      lift: 0,
    };
  }

  /** tan of half the view across and up: the narrower side of the screen sees 45 degrees */
  private tans() {
    const t = Math.tan(22.5 * RAD),
      { width: w, height: h } = this.size();
    return { x: t * Math.max(1, w / h), y: t * Math.max(1, h / w) };
  }

  /** the distance at which a box this size fills the view */
  private fit(hw: number, hh: number) {
    const t = this.tans();
    return clamp(
      Math.max(hw / t.x, hh / t.y) * 1.12,
      this.limits.d[0],
      this.limits.d[1],
    );
  }

  /** degrees; ms > 0 eases there, unless the visitor prefers less motion */
  setView(v: Partial<View>, ms = 0) {
    const pick = (x: unknown, d: number) =>
      typeof x === "number" && isFinite(x) ? x : d;
    const cur = this.view,
      L = this.limits;
    const to: View = {
      azimuth: pick(v.azimuth, cur.azimuth),
      elevation: clamp(pick(v.elevation, cur.elevation), L.el[0], L.el[1]),
      distance: clamp(pick(v.distance, cur.distance), L.d[0], L.d[1]),
      lift: pick(v.lift, cur.lift),
    };
    if (L.az) to.azimuth = clamp(to.azimuth, L.az[0], L.az[1]);
    else
      to.azimuth =
        cur.azimuth + ((((to.azimuth - cur.azimuth) % 360) + 540) % 360) - 180; // the short way round
    if (ms > 0 && !this.reduced)
      this.tween = { from: { ...cur }, to, t0: performance.now(), ms };
    else {
      this.tween = null;
      Object.assign(this.view, to);
    }
  }

  get tweening(): boolean {
    return !!this.tween;
  }

  getView() {
    const v = this.view;
    return {
      azimuth: round(
        this.limits.az ? v.azimuth : ((v.azimuth % 360) + 360) % 360,
      ),
      elevation: round(v.elevation),
      distance: round(v.distance),
    };
  }

  /** a 3D act: a screen width is one full turn; a film card only tilts */
  orbitBy(dx: number, dy: number) {
    const k = this.kind === "3d" ? [360, 180] : [120, 120],
      { width, height } = this.size();
    this.setView({
      azimuth: this.view.azimuth + (dx * k[0]) / Math.max(1, width),
      elevation: this.view.elevation + (dy * k[1]) / Math.max(1, height),
    });
  }

  zoomTo(d: number) {
    this.setView({ distance: d });
  }

  /** the envelope rises above a film card: step back to keep it in view (and come back when it is put away) */
  frameFilm(up: boolean) {
    if (up)
      this.setView(
        {
          lift: 0.28,
          distance: Math.max(this.view.distance, this.fit(0.6, 0.56)),
        },
        1400,
      );
    else
      this.setView({ lift: 0, distance: this.fit(0.5, this.aspect / 2) }, 400);
  }

  /** the camera MindAR would have set: 45 degrees across the narrower side */
  fitLens(cam: THREE.PerspectiveCamera) {
    const t = this.tans();
    cam.fov = (2 * Math.atan(t.y)) / RAD;
    const { width, height } = this.size();
    cam.aspect = width / Math.max(1, height);
    cam.near = 0.02;
    cam.far = 50;
    cam.updateProjectionMatrix();
  }

  /** every frame: ease towards a requested view, run the turntable */
  tick(dt: number, now: number) {
    const v = this.view;
    if (this.tween) {
      const tw = this.tween,
        k = Math.min(1, (now - tw.t0) / tw.ms),
        s = k < 0.5 ? 2 * k * k : 1 - Math.pow(2 - 2 * k, 2) / 2;
      (["azimuth", "elevation", "distance", "lift"] as const).forEach((n) => {
        v[n] = tw.from[n] + (tw.to[n] - tw.from[n]) * s;
      });
      if (k >= 1) {
        this.tween = null;
        this.onMoved();
      }
    } else if (this.turntable && !this.held) {
      if (this.kind === "3d")
        v.azimuth += 15 * dt; // one round in 24 s
      else {
        v.azimuth += this.sway * 6 * dt;
        if (Math.abs(v.azimuth) > 20) this.sway = -Math.sign(v.azimuth);
      } // a film card sways a little
      this.onMoved();
    }
  }

  /** the card frame's matrix in front of the camera, for the view */
  cardMatrix(out: THREE.Matrix4): THREE.Matrix4 {
    const a = this.view.azimuth * RAD,
      e = (this.view.elevation - 90) * RAD,
      { M, R, P } = this;
    if (this.kind === "3d")
      M.makeRotationX(e).multiply(R.makeRotationZ(a)); // turn the act on the card, then tip the card back to look down on it
    else M.makeRotationY(a).multiply(R.makeRotationX(e)); // facing the camera, tilted a little
    P.set(0, this.view.lift, this.pivot).applyMatrix4(M);
    M.setPosition(-P.x, -P.y, -this.view.distance - P.z);
    return out.copy(M);
  }
}
