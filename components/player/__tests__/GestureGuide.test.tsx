// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GestureGuide, guideRows } from "../GestureGuide";
import { T } from "../strings";

afterEach(cleanup);
const icons = (o: Parameters<typeof guideRows>[0]) =>
  guideRows(o).map((r) => r.icon);

describe("guideRows", () => {
  it("in the camera, pinned: turn, tip, move with two fingers, pinch, tap, and a tap on a photo", () => {
    expect(
      icons({ mode: "ar", kind: "3d", pinned: true, photos: true }),
    ).toEqual(["turn", "tip", "move", "size", "tap", "photo"]);
  });

  it("following the printed card, there is nothing to move or resize", () => {
    expect(
      icons({ mode: "ar", kind: "3d", pinned: false, photos: false }),
    ).toEqual(["turn", "tip", "tap"]);
  });

  it("in the preview: turn round it, come closer, tap", () => {
    expect(
      icons({ mode: "preview", kind: "3d", pinned: false, photos: true }),
    ).toEqual(["orbit", "size", "tap", "photo"]);
    expect(
      guideRows({
        mode: "preview",
        kind: "3d",
        pinned: false,
        photos: false,
      })[1].text,
    ).toBe(T.guideZoom);
  });

  it("a film moves with one finger once pinned, and is only tapped before", () => {
    expect(
      icons({ mode: "ar", kind: "film", pinned: true, photos: false }),
    ).toEqual(["move", "size", "tap"]);
    expect(
      icons({ mode: "ar", kind: "film", pinned: false, photos: false }),
    ).toEqual(["tap"]);
  });
});

describe("GestureGuide", () => {
  it("says the scene is pinned, lists the gestures in Vietnamese, and closes", () => {
    const onClose = vi.fn();
    render(
      <GestureGuide
        mode="ar"
        kind="3d"
        pinned
        photos={false}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole("heading", { name: T.guideTitle })).toBeTruthy();
    expect(screen.getByText(T.guidePinned)).toBeTruthy();
    expect(screen.getByText(T.guideMove)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: T.guideOk }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has no pinned note in the preview", () => {
    render(
      <GestureGuide
        mode="preview"
        kind="3d"
        pinned={false}
        photos={false}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText(T.guidePinned)).toBeNull();
    expect(screen.getByText(T.guideOrbit)).toBeTruthy();
  });
});
