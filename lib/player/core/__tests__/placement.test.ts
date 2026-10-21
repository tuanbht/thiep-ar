import { describe, expect, it } from "vitest";
import { Matrix4, Quaternion, Vector3 } from "three";
import {
  addTip,
  FACE_ELEVATION,
  facingPose,
  facingRotation,
  pivotOffset,
  tipAxisOnCard,
} from "../placement";
import { clamp, pickAxis, tipAngle, turnAngle } from "../gestures";

const close = (v: Vector3, x: number, y: number, z: number) => {
  expect(v.x).toBeCloseTo(x);
  expect(v.y).toBeCloseTo(y);
  expect(v.z).toBeCloseTo(z);
};

describe("placement", () => {
  it("faces the camera: the act's up is the screen's up, tilted towards you, its front towards you", () => {
    const q = facingRotation(FACE_ELEVATION, new Quaternion());
    const e = (FACE_ELEVATION * Math.PI) / 180;
    close(new Vector3(0, 0, 1).applyQuaternion(q), 0, Math.cos(e), Math.sin(e));
    close(
      new Vector3(0, -1, 0).applyQuaternion(q),
      0,
      -Math.sin(e),
      Math.cos(e),
    );
  });

  it("puts the act's middle on the card's centre at the card's scale", () => {
    const anchor = new Matrix4().compose(
      new Vector3(0.1, -0.2, -2),
      new Quaternion(),
      new Vector3(0.5, 0.5, 0.5),
    );
    const q = facingRotation(0, new Quaternion());
    const pose = facingPose(anchor, 0.2, q);
    expect(pose.scale).toBeCloseTo(0.5);
    const middle = new Vector3(0, 0, 0.2)
      .multiplyScalar(pose.scale)
      .applyQuaternion(pose.quaternion)
      .add(pose.position);
    close(middle, 0.1, -0.2, -2);
  });

  it("tips about the act's middle, not its feet", () => {
    const tip = addTip(new Quaternion(), new Vector3(1, 0, 0), Math.PI / 2);
    const off = pivotOffset(tip, 0.2);
    const middle = new Vector3(0, 0, 0.2).applyQuaternion(tip).add(off);
    close(middle, 0, 0, 0.2);
    expect(pivotOffset(new Quaternion(), 0.2).length()).toBeCloseTo(0);
  });

  it("tips about the screen's across line laid on the card, falling back to the card's own", () => {
    close(tipAxisOnCard(new Quaternion(), new Quaternion()), 1, 0, 0);
    const turned = new Quaternion().setFromAxisAngle(
      new Vector3(0, 0, 1),
      Math.PI / 2,
    );
    close(tipAxisOnCard(new Quaternion(), turned), 0, -1, 0);
    const edgeOn = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      Math.PI / 2,
    );
    close(tipAxisOnCard(new Quaternion(), edgeOn), 1, 0, 0);
  });
});

describe("gestures", () => {
  it("picks one axis per drag and scales angles to the screen", () => {
    expect(pickAxis(10, 3)).toBe("turn");
    expect(pickAxis(2, -9)).toBe("tip");
    expect(turnAngle(390, 390)).toBeCloseTo(2 * Math.PI);
    expect(tipAngle(422, 844)).toBeCloseTo(Math.PI / 2);
    expect(turnAngle(5, 0)).toBeCloseTo(10 * Math.PI);
    expect(clamp(5, 0, 1)).toBe(1);
  });
});
