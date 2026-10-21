import { describe, expect, it } from "vitest";
import { PreviewView } from "../preview";

const viewOn = (width: number, height: number) =>
  new PreviewView(
    "3d",
    0.625,
    () => {},
    () => ({ width, height }),
  ).view;

describe("PreviewView's first look at a 3D act", () => {
  it("comes close and near eye level on a phone held upright, so the act fills it", () => {
    expect(viewOn(430, 860)).toMatchObject({ elevation: 26, distance: 1.4 });
    expect(viewOn(320, 568)).toMatchObject({ elevation: 26, distance: 1.4 });
  });

  it("stands back and a little higher on a wide screen, so a tall act keeps its top in view", () => {
    expect(viewOn(1280, 720)).toMatchObject({ elevation: 32, distance: 1.7 });
    expect(viewOn(568, 320)).toMatchObject({ elevation: 32, distance: 1.7 });
  });
});
