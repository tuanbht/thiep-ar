/* Where a 3D act stands. Its scene.js builds it in a "host" frame where it stands up along +z and faces -y (the
   card's bottom edge).
   - "face" (camera mode's default): the act stands in front of the card and faces the phone, upright on the screen,
     its middle on the card's centre, looked at a little from above; the card's distance still sizes it.
   - "card": it stands up out of the printed card, as on a table, and you walk round it.
   A finger can tip either one; in "face" the tip turns about the screen's own across line. */
import { Matrix4, Quaternion, Vector3 } from "three";

export type Placement = "face" | "card";

/** How far above the act the phone seems to look from in "face" (degrees): enough to see its floor, as in the Studio. */
export const FACE_ELEVATION = 12;

const X = new Vector3(1, 0, 0);

/** The host's rotation in the camera's frame when it faces the camera: up to the screen's up, tilted `elevation`
    towards the viewer, front to the viewer; then the finger's tip (in camera space). */
export function facingRotation(
  elevationDeg: number,
  tip: Quaternion,
  camera: Quaternion = new Quaternion(),
): Quaternion {
  const base = new Quaternion().setFromAxisAngle(
    X,
    ((elevationDeg - 90) * Math.PI) / 180,
  );
  return camera.clone().multiply(tip.clone().multiply(base));
}

export interface Pose {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
}

/** The host's pose in world space for "face": the act's middle (`middle` card widths up its axis) on the card's
    centre, at the card's own scale. `anchor` is the card frame's world matrix. */
export function facingPose(
  anchor: Matrix4,
  middle: number,
  rotation: Quaternion,
): Pose {
  const centre = new Vector3(),
    q = new Quaternion(),
    s = new Vector3();
  anchor.decompose(centre, q, s);
  const scale = s.x;
  const up = new Vector3(0, 0, middle * scale).applyQuaternion(rotation);
  return { position: centre.sub(up), quaternion: rotation.clone(), scale };
}

/** "card": the host's local position for a tip about the act's middle (the act pivots about it, not its feet). */
export function pivotOffset(tip: Quaternion, middle: number): Vector3 {
  const p = new Vector3(0, 0, middle);
  return p.clone().sub(p.clone().applyQuaternion(tip));
}

/** "card": the line a vertical drag tips about, in the card's frame: the screen's across line laid flat on the card,
    so it tips towards or away from you whichever side of the card you stand on. */
export function tipAxisOnCard(
  cameraWorld: Quaternion,
  cardWorld: Quaternion,
): Vector3 {
  const across = X.clone()
    .applyQuaternion(cameraWorld)
    .applyQuaternion(cardWorld.clone().invert());
  across.z = 0;
  return across.lengthSq() < 1e-4 ? X.clone() : across.normalize();
}

/** A tip of `angle` about `axis`, added to what the finger had already done. */
export const addTip = (
  tip: Quaternion,
  axis: Vector3,
  angle: number,
): Quaternion => new Quaternion().setFromAxisAngle(axis, angle).multiply(tip);
