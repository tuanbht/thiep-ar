/* One card on screen: the stage, the card frame the act is built on, and what moves that frame — MindAR following the
   printed card (camera mode), the orbit view (preview) or the gyroscope once pinned. In camera mode a 3D act faces
   the phone by default ("face"); in the preview it stands on the virtual card, which the view turns. */
import type { Theme } from "../core/card";
import * as THREE from "three";
import {
  addTip,
  FACE_ELEVATION,
  facingPose,
  facingRotation,
  pivotOffset,
  tipAxisOnCard,
  type Placement,
} from "../core/placement";
import { clamp, tipAngle } from "../core/gestures";
import type { Act3d } from "./act3d";
import { ArSource } from "./arSource";
import { askForGyroscope, Gyro } from "./pin";
import { PreviewView } from "./preview";
import { Stage } from "./stage";
import type { TapHit } from "./loadSceneScript";
import type { Act } from "./types";

export type Mode = "ar" | "preview";

export interface CameraEvents {
  onFound(target: number): void;
  onLost(target: number): void;
}

const X = new THREE.Vector3(1, 0, 0);
const NO_TURN = new THREE.Quaternion();

export class CardSession {
  readonly stage: Stage;
  /** the card frame acts are built on: x across the card, y up it, z out of it, 1 = its width */
  readonly frame = new THREE.Group();
  mode: Mode | null = null;
  preview: PreviewView | null = null;
  private source: ArSource | null = null;
  private following = 0;
  private act: Act | null = null;
  private act3d: Act3d | null = null;
  private middle = 0.2;
  private tip = new THREE.Quaternion();
  private pinnedAt: {
    base: THREE.Matrix4;
    scale: number;
    camera: THREE.Quaternion | null;
  } | null = null;
  private readonly gyro = new Gyro();
  private readonly raycaster = new THREE.Raycaster();
  private paper: THREE.Mesh | null = null;
  private paperAspect = 0;
  private readonly untick: () => void;
  private readonly unresize: () => void;

  constructor(
    container: HTMLElement,
    public placement: Placement = "face",
  ) {
    this.stage = new Stage(container);
    this.frame.name = "card";
    this.frame.matrixAutoUpdate = false;
    this.frame.visible = false;
    this.stage.scene.add(this.frame);
    this.untick = this.stage.onTick((dt, now) => this.tick(dt, now));
    this.unresize = this.stage.onResized(() => {
      if (this.mode === "preview" && this.preview)
        this.preview.fitLens(this.stage.camera);
    });
  }

  get pinned(): boolean {
    return !!this.pinnedAt;
  }
  get currentAct(): Act | null {
    return this.act;
  }

  /** What a tap at (clientX, clientY) finds in a 3D act: a photo to show big, or the act took it; null for nothing, and
      for a film (its taps play on). */
  pick(clientX: number, clientY: number): TapHit | null {
    const api = this.act3d?.api;
    if (!api?.pick) return null;
    const r = this.stage.renderer.domElement.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        ((clientX - r.left) / r.width) * 2 - 1,
        -((clientY - r.top) / r.height) * 2 + 1,
      ),
      this.stage.camera,
    );
    try {
      return api.pick(this.raycaster);
    } catch (e) {
      console.error("[session] the act could not answer a tap", e);
      return null;
    }
  }

  /** set the lighting for the act about to be built (a 3D act is tone-mapped, a film is not) */
  prepareFor(kind: "film" | "3d", theme: Theme = "night") {
    this.stage.lightFor(kind, theme);
  }

  /** put an act on the card, replacing the one there; `middle`: a 3D act's middle, in card widths above the card */
  setAct(act: Act, middle = 0.2) {
    this.clearAct();
    this.act = act;
    if (act.kind === "3d") {
      this.act3d = act as Act3d;
      this.middle = middle;
      this.placeHost();
    }
  }

  clearAct() {
    this.act?.dispose();
    this.act = null;
    this.act3d = null;
    this.tip.identity();
  }

  private get facing(): boolean {
    return this.mode === "ar" && this.placement === "face";
  }

  /** a 3D act's host: in "face" it hangs from the scene and is placed each frame; otherwise it stands on the card */
  private placeHost() {
    const h = this.act3d?.host;
    if (!h) return;
    if (this.facing) {
      if (h.parent !== this.stage.scene) this.stage.scene.add(h);
      return;
    }
    if (h.parent !== this.frame) this.frame.add(h);
    h.visible = true;
    h.scale.setScalar(1);
    h.quaternion.copy(this.tip);
    h.position.copy(pivotOffset(this.tip, this.middle));
  }

  setPlacement(p: Placement) {
    this.placement = p;
    this.tip.identity();
    this.placeHost();
  }

  /* ── camera mode ── */

  async startCamera(targets: string, events: CameraEvents): Promise<void> {
    this.stopCamera();
    this.stopPreview();
    this.mode = "ar";
    this.frame.visible = false;
    this.stage.camera.quaternion.identity();
    this.stage.camera.position.set(0, 0, 0);
    this.placeHost();
    this.source = new ArSource({
      container: this.stage.renderer.domElement.parentElement ?? document.body,
      camera: this.stage.camera,
      scene: this.stage.scene,
      targets,
      onFound: events.onFound,
      onLost: events.onLost,
    });
    await this.source.start();
  }

  /** which card in the tracking file the act follows (the scanner picks the one it found) */
  follow(target: number) {
    this.following = target;
  }

  stopCamera() {
    this.unpin();
    this.source?.stop();
    this.source = null;
    if (this.mode === "ar") {
      this.mode = null;
      this.frame.visible = false;
    }
  }

  /* ── the preview ── */

  startPreview(
    kind: "film" | "3d",
    aspect: number,
    onMoved: () => void,
  ): PreviewView {
    this.stopCamera();
    this.mode = "preview";
    this.preview = new PreviewView(
      kind,
      aspect,
      onMoved,
      () => this.stage.size,
    );
    this.stage.camera.quaternion.identity();
    this.stage.camera.position.set(0, 0, 0);
    this.preview.fitLens(this.stage.camera);
    if (this.act3d && this.act3d.turned) this.act3d.turn(-this.act3d.turned); // the act faces front again: the view does the turning now
    this.tip.identity();
    this.placeHost();
    if (this.paper && this.paperAspect !== aspect) {
      this.disposePaper();
    }
    if (!this.paper) {
      // no camera picture under it: a plain paper card
      const m = new THREE.MeshBasicMaterial({
        color: 0xf4ecd8,
        toneMapped: false,
      });
      this.paper = new THREE.Mesh(new THREE.PlaneGeometry(1, aspect), m);
      this.paper.position.z = -0.001;
      this.paper.receiveShadow = true;
      this.paperAspect = aspect;
      this.frame.add(this.paper);
    }
    this.paper.visible = true;
    return this.preview;
  }

  /** leave the preview (the camera takes over): the paper card would hide the printed one */
  stopPreview() {
    if (this.mode === "preview") {
      this.mode = null;
      this.frame.visible = false;
    }
    this.preview = null;
    if (this.paper) this.paper.visible = false;
  }

  private disposePaper() {
    if (!this.paper) return;
    this.paper.removeFromParent();
    this.paper.geometry.dispose();
    (this.paper.material as THREE.Material).dispose();
    this.paper = null;
  }

  /* ── fingers ── */

  turn(rad: number) {
    this.act3d?.turn(rad);
  }

  /** tip the act towards you (dy > 0) or away, about its middle */
  tipBy(dy: number) {
    if (!this.act3d) return;
    const angle = tipAngle(dy, this.stage.size.height);
    if (this.facing)
      this.tip = addTip(this.tip, X, angle); // across the screen
    else {
      const cardQ = new THREE.Quaternion();
      this.frame.matrixWorld.decompose(
        new THREE.Vector3(),
        cardQ,
        new THREE.Vector3(),
      );
      this.tip = addTip(
        this.tip,
        tipAxisOnCard(this.stage.camera.quaternion, cardQ),
        angle,
      );
      this.placeHost();
    }
  }

  level() {
    this.tip.identity();
    this.placeHost();
  }

  /** which way the act's up points as the camera sees it (x right, y up, z towards you); null without a 3D act */
  get actUp(): [number, number, number] | null {
    const h = this.act3d?.host;
    if (!h || !h.parent) return null;
    const up = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(h.getWorldQuaternion(new THREE.Quaternion()))
      .applyQuaternion(this.stage.camera.quaternion.clone().invert());
    return [up.x, up.y, up.z].map((v) => Math.round(v * 100) / 100) as [
      number,
      number,
      number,
    ];
  }

  /** how far the act is tipped, in degrees */
  get tipDegrees(): number {
    return Math.round(
      (2 * Math.acos(Math.min(1, Math.abs(this.tip.w))) * 180) / Math.PI,
    );
  }

  /* ── pin ── */

  async pin(): Promise<boolean> {
    if (this.pinnedAt || this.mode !== "ar" || !this.frame.visible)
      return false;
    const gyro = await askForGyroscope();
    this.pinnedAt = { base: this.frame.matrix.clone(), scale: 1, camera: null };
    if (gyro) this.gyro.start();
    return true;
  }

  unpin() {
    if (!this.pinnedAt) return;
    this.pinnedAt = null;
    this.gyro.stop();
    this.stage.camera.quaternion.identity();
  }

  /** pinch: 0.25 to 4 times the size it was pinned at */
  resize(k: number) {
    if (this.pinnedAt) this.pinnedAt.scale = clamp(k, 0.25, 4);
  }
  get pinScale(): number {
    return this.pinnedAt?.scale ?? 1;
  }

  /** slide the pinned card across the screen, whichever way the camera faces */
  moveBy(dx: number, dy: number) {
    const p = this.pinnedAt;
    if (!p) return;
    const cam = this.stage.camera,
      at = new THREE.Vector3().setFromMatrixPosition(p.base);
    const k =
      (2 * (at.length() || 1)) /
      ((cam.projectionMatrix.elements[5] || 1) * this.stage.size.height);
    at.addScaledVector(
      new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion),
      dx * k,
    ).addScaledVector(
      new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion),
      -dy * k,
    );
    p.base.setPosition(at);
  }

  /* ── every frame ── */

  private tick(dt: number, now: number) {
    const f = this.frame;
    if (this.mode === "preview" && this.preview) {
      this.preview.tick(dt, now);
      this.preview.cardMatrix(f.matrix);
      f.visible = true;
    } else if (this.mode === "ar") {
      const p = this.pinnedAt;
      if (p) {
        const q = this.gyro.latest;
        if (q) {
          if (!p.camera) {
            p.camera = q.clone();
            p.base.premultiply(
              new THREE.Matrix4().makeRotationFromQuaternion(q),
            );
          } // carry the act with the camera's first turn
          this.stage.camera.quaternion.copy(q);
        }
        f.matrix
          .copy(p.base)
          .multiply(new THREE.Matrix4().makeScale(p.scale, p.scale, p.scale));
        f.visible = true;
      } else {
        const a = this.source?.anchors[this.following];
        f.visible = !!a?.visible;
        if (a?.visible) f.matrix.copy(a.matrix);
      }
    }
    f.matrixWorldNeedsUpdate = true;
    const h = this.act3d?.host;
    if (h && h.parent === this.stage.scene) {
      h.visible = f.visible;
      if (f.visible) {
        const pose = facingPose(
          f.matrix,
          this.middle,
          facingRotation(
            FACE_ELEVATION,
            this.tip,
            this.pinnedAt?.camera ?? NO_TURN,
          ),
        );
        h.position.copy(pose.position);
        h.quaternion.copy(pose.quaternion);
        h.scale.setScalar(pose.scale);
      }
    }
    this.act?.update?.(dt, now);
  }

  dispose() {
    this.untick();
    this.clearAct();
    this.stopCamera();
    this.unresize();
    this.disposePaper();
    this.stage.dispose();
  }
}
