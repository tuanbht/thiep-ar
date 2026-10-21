/* Fingers and the mouse on the act, inside one element (the player's root, or the preview's box). A tap plays on
   (or opens the letter); a drag is never a tap.
   - preview: one finger turns the view round the card; a pinch or the wheel brings it nearer (when `zoom`);
   - camera mode, a 3D act: one finger across turns it, up or down tips it (each drag does one, whichever way it starts);
   - pinned: a pinch resizes it, two fingers move it (a pinned film also moves with one finger).
   Buttons and the letter (anything marked data-ui) are left alone. */
import { useEffect, useRef } from "react";
import {
  DRAG_START,
  pickAxis,
  turnAngle,
  type DragAxis,
} from "@/lib/player/core/gestures";
import type { CardSession } from "@/lib/player/engine/session";

export interface GestureTarget {
  element: HTMLElement | null;
  session: CardSession | null;
  /** the camera or the preview is running */
  running: boolean;
  /** the act can be tapped on (the card is in view, or pinned) */
  live: boolean;
  kind: "film" | "3d" | null;
  /** pinch and wheel zoom the preview (off in the shop's box: the wheel scrolls the page there) */
  zoom: boolean;
  onTap(): void;
}

const ignored = (t: EventTarget | null) =>
  t instanceof Element && !!t.closest("button, a, input, textarea, [data-ui]");

export function useGestures(g: GestureTarget) {
  const ref = useRef(g);
  useEffect(() => {
    ref.current = g;
  });
  const { element } = g;

  useEffect(() => {
    if (!element) return;
    let dragged = false,
      axis: DragAxis | null = null,
      last: [number, number] | null = null;
    let pinch = 0,
      scale0 = 1,
      dist0 = 1,
      mid0: [number, number] | null = null,
      mouse: [number, number] | null = null;
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList): [number, number] => [
      (t[0].clientX + t[1].clientX) / 2,
      (t[0].clientY + t[1].clientY) / 2,
    ];
    const held = (on: boolean) => {
      const p = ref.current.session?.preview;
      if (p) p.held = on;
    };

    const oneFinger = (dx: number, dy: number) => {
      const { session, kind } = ref.current;
      if (!session) return;
      if (session.mode === "preview" && session.preview) {
        session.preview.orbitBy(dx, dy);
        return;
      }
      if (kind === "3d") {
        axis = axis ?? pickAxis(dx, dy);
        if (axis === "turn")
          session.turn(turnAngle(dx, session.stage.size.width));
        else session.tipBy(dy);
      } else if (session.pinned) session.moveBy(dx, dy);
    };

    const onTouchStart = (e: TouchEvent) => {
      dragged = false;
      axis = null;
      if (ignored(e.target)) {
        last = null;
        pinch = 0;
        return;
      }
      const s = ref.current.session;
      if (e.touches.length === 2) {
        pinch = dist(e.touches);
        mid0 = mid(e.touches);
        last = null;
        scale0 = s?.pinScale ?? 1;
        dist0 = s?.preview?.view.distance ?? 1;
      } else if (e.touches.length === 1)
        last = [e.touches[0].clientX, e.touches[0].clientY];
      held(true);
    };
    const onTouchMove = (e: TouchEvent) => {
      const { session, running, zoom } = ref.current;
      if (!running || !session) return;
      if (e.touches.length === 2 && pinch) {
        dragged = true;
        if (session.mode === "preview" && session.preview) {
          if (zoom) session.preview.zoomTo((dist0 * pinch) / dist(e.touches));
          return;
        }
        if (session.pinned) {
          session.resize((scale0 * dist(e.touches)) / pinch);
          const m = mid(e.touches);
          if (mid0) session.moveBy(m[0] - mid0[0], m[1] - mid0[1]);
          mid0 = m;
        }
      } else if (e.touches.length === 1 && last) {
        const dx = e.touches[0].clientX - last[0],
          dy = e.touches[0].clientY - last[1];
        if (dragged || Math.hypot(dx, dy) > DRAG_START) {
          dragged = true;
          last = [e.touches[0].clientX, e.touches[0].clientY];
          oneFinger(dx, dy);
        }
      }
    };
    const onTouchEnd = () => {
      last = null;
      pinch = 0;
      mid0 = null;
      held(false);
      setTimeout(() => {
        dragged = false;
      }, 300);
    };

    const onMouseDown = (e: MouseEvent) => {
      dragged = false;
      axis = null;
      if (!ref.current.running || ignored(e.target) || e.button !== 0) return;
      mouse = [e.clientX, e.clientY];
      held(true);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!mouse) return;
      const dx = e.clientX - mouse[0],
        dy = e.clientY - mouse[1];
      if (dragged || Math.hypot(dx, dy) > 3) {
        dragged = true;
        mouse = [e.clientX, e.clientY];
        oneFinger(dx, dy);
      }
    };
    const onMouseUp = () => {
      if (!mouse) return;
      mouse = null;
      held(false);
      setTimeout(() => {
        dragged = false;
      }, 0);
    };

    const onWheel = (e: WheelEvent) => {
      const { session: s, running, zoom } = ref.current;
      if (!s || !running || !zoom) return;
      if (s.mode === "preview" && s.preview) {
        // a trackpad pinch comes as a wheel too
        e.preventDefault();
        s.preview.zoomTo(
          s.preview.view.distance *
            Math.exp(e.deltaY * (e.deltaMode ? 16 : 1) * 0.0015),
        );
      } else if (s.pinned) {
        e.preventDefault();
        s.resize(s.pinScale * (e.deltaY < 0 ? 1.08 : 0.93));
      }
    };
    const onClick = (e: MouseEvent) => {
      const { running, live } = ref.current;
      if (running && live && !dragged && !ignored(e.target))
        ref.current.onTap();
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: true });
    element.addEventListener("touchend", onTouchEnd, { passive: true });
    element.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    element.addEventListener("wheel", onWheel, { passive: false });
    element.addEventListener("click", onClick);
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("click", onClick);
    };
  }, [element]);
}
