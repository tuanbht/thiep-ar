/* Camera mode: the phone's back camera behind the stage, and MindAR finding the printed card in it. One anchor per
   card in the tracking file (the player's file holds one; the scanner's holds every template's); MindAR moves an
   anchor onto its card while it is in view. An anchor is a card frame: x across the card, y up it, z out of it,
   1 = the card's width, origin at its centre. Ported from MindAR's own three.js wrapper, without its overlays. */
import * as THREE from "three";
import type {
  Controller,
  ControllerUpdate,
} from "mind-ar/dist/mindar-image.prod.js";

export interface ArSourceOptions {
  container: HTMLElement;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  /** the .mind file */
  targets: string;
  onFound(target: number): void;
  onLost(target: number): void;
}

/** Steady tracking that still follows a quick move; a few missed frames before the card counts as gone. */
const TRACKING = {
  maxTrack: 1,
  filterMinCF: 0.0005,
  filterBeta: 0.01,
  missTolerance: 8,
  warmupTolerance: 3,
};

export class CameraUnavailable extends Error {}

export class ArSource {
  readonly anchors: THREE.Group[] = [];
  private video: HTMLVideoElement | null = null;
  private controller: Controller | null = null;
  private post: THREE.Matrix4[] = [];
  private stopped = false;
  private readonly onResize = () => this.resize();

  constructor(private readonly o: ArSourceOptions) {}

  /** A stop() while this runs wins: every await is followed by a look at `stopped`, so a stopped start adds no
      anchors, keeps no camera and leaves its controller disposed. */
  async start(): Promise<void> {
    this.stopped = false;
    const video = await this.startVideo();
    if (!video || this.stopped) return;
    const { Controller } = await import("mind-ar/dist/mindar-image.prod.js");
    if (this.stopped) return;
    const controller = new Controller({
      inputWidth: video.videoWidth,
      inputHeight: video.videoHeight,
      ...TRACKING,
      onUpdate: (d) => this.update(d),
    });
    this.controller = controller;
    this.resize();
    const { dimensions } = await controller.addImageTargets(this.o.targets);
    if (this.stopped || this.controller !== controller) return; // stop() disposed it
    this.post = dimensions.map(([w, h]) =>
      new THREE.Matrix4().compose(
        new THREE.Vector3(w / 2, h / 2, 0),
        new THREE.Quaternion(),
        new THREE.Vector3(w, w, w),
      ),
    );
    for (let i = 0; i < dimensions.length; i++) {
      const g = new THREE.Group();
      g.name = `card-${i}`;
      g.visible = false;
      g.matrixAutoUpdate = false;
      this.o.scene.add(g);
      this.anchors.push(g);
    }
    await controller.dummyRun(video);
    if (this.stopped || this.controller !== controller) return;
    controller.processVideo(video);
    window.addEventListener("resize", this.onResize);
  }

  /** the camera's picture, playing; null when stop() came first (its stream is stopped then) */
  private startVideo(): Promise<HTMLVideoElement | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.mediaDevices?.getUserMedia)
        return reject(
          new CameraUnavailable("This browser has no camera access."),
        );
      const video = document.createElement("video");
      video.className = "camera-feed";
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.muted = true;
      this.o.container.prepend(video);
      this.video = video;
      navigator.mediaDevices
        .getUserMedia({ audio: false, video: { facingMode: "environment" } })
        .then(
          (stream) => {
            if (this.stopped) {
              stream.getTracks().forEach((t) => t.stop());
              resolve(null);
              return;
            }
            video.addEventListener(
              "loadedmetadata",
              () => {
                video.setAttribute("width", String(video.videoWidth));
                video.setAttribute("height", String(video.videoHeight));
                resolve(video);
              },
              { once: true },
            );
            video.srcObject = stream;
            video.play().catch(() => {
              /* autoplay: it plays once the metadata is in */
            });
          },
          (e: unknown) => {
            video.remove();
            this.video = null;
            reject(
              new CameraUnavailable(
                e instanceof Error
                  ? e.message
                  : "The camera could not be started.",
              ),
            );
          },
        );
    });
  }

  private update(d: ControllerUpdate) {
    if (d.type !== "updateMatrix") return;
    const a = this.anchors[d.targetIndex];
    if (!a) return;
    const was = a.visible;
    if (d.worldMatrix) {
      a.matrix.fromArray(d.worldMatrix).multiply(this.post[d.targetIndex]);
      a.matrixWorldNeedsUpdate = true;
      a.visible = true;
      if (!was) this.o.onFound(d.targetIndex);
    } else if (was) {
      a.visible = false;
      this.o.onLost(d.targetIndex);
    }
  }

  /** the camera picture covers the screen; the three.js camera sees exactly what MindAR's maths assume */
  resize() {
    const { video, controller, o } = this;
    if (!video || !controller) return;
    const cw = o.container.clientWidth || window.innerWidth,
      ch = o.container.clientHeight || window.innerHeight;
    const va = video.videoWidth / video.videoHeight,
      ca = cw / ch;
    const vw = va > ca ? ch * va : cw,
      vh = va > ca ? ch : cw / va;
    video.style.width = `${vw}px`;
    video.style.height = `${vh}px`;
    video.style.left = `${-(vw - cw) / 2}px`;
    video.style.top = `${-(vh - ch) / 2}px`;
    const m = controller.getProjectionMatrix(),
      ia = controller.inputWidth / controller.inputHeight;
    const k =
      ia > ca
        ? video.height / controller.inputHeight
        : video.width / controller.inputWidth;
    const shown =
      (ia > ca ? ch : (cw / controller.inputWidth) * controller.inputHeight) *
      k;
    const cam = o.camera;
    cam.fov = (2 * Math.atan((1 / m[5]) * (ch / shown)) * 180) / Math.PI;
    cam.near = m[14] / (m[10] - 1);
    cam.far = m[14] / (m[10] + 1);
    cam.aspect = cw / ch;
    cam.updateProjectionMatrix();
  }

  stop() {
    this.stopped = true;
    window.removeEventListener("resize", this.onResize);
    try {
      this.controller?.dispose();
    } catch (e) {
      console.warn("[ar] the tracker did not stop cleanly", e);
    } // closes its worker too
    this.controller = null;
    if (this.video) {
      stopTracks(this.video);
      this.video.remove();
      this.video = null;
    }
    for (const a of this.anchors) a.removeFromParent();
    this.anchors.length = 0;
  }
}

function stopTracks(video: HTMLVideoElement) {
  const s = video.srcObject;
  if (s && "getTracks" in s)
    (s as MediaStream).getTracks().forEach((t) => t.stop());
  video.srcObject = null;
}
