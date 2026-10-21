import { describe, expect, it, vi } from "vitest";
import { Flow, LOOKING, type FlowView } from "../flow";
import type { Chapter } from "../template";

const chapters: Chapter[] = [
  { end: 0, hint: "Tap for the photo", reveal: false },
  { end: 1, hint: "Tap to read the letter", reveal: false },
];

function make(looking?: string) {
  const act = { play: vi.fn(), pause: vi.fn(), resume: vi.fn(), kick: vi.fn() };
  const views: FlowView[] = [];
  const flow = new Flow(chapters, act, (v) => views.push(v), looking);
  return { flow, act, views };
}

describe("Flow", () => {
  it("waits at idle, looks for the card in the page's words, then plays the first chapter when found", () => {
    const { flow, act } = make("Đang tìm tấm thiệp");
    expect(flow.view.state).toBe("loading");
    flow.loaded();
    expect(flow.view.state).toBe("idle");
    flow.starting();
    expect(flow.view).toMatchObject({
      phase: "starting",
      hint: "Đang tìm tấm thiệp",
      frame: true,
    });
    flow.scanning();
    expect(flow.view.hint).toBe("Đang tìm tấm thiệp");
    flow.found();
    expect(flow.view).toMatchObject({
      state: "playing:0",
      found: true,
      hint: null,
      dots: true,
    });
    expect(act.play).toHaveBeenCalledWith(0);
  });

  it("defaults to English while looking", () => {
    const { flow } = make();
    flow.starting();
    expect(flow.view.hint).toBe(LOOKING);
  });

  it("waits at each stop with its hint, plays on with a tap, and opens the letter after the last", () => {
    const { flow, act } = make();
    flow.loaded();
    flow.found();
    flow.stopReached(0);
    expect(flow.view).toMatchObject({
      state: "paused:0",
      hint: "Tap for the photo",
      finished: false,
    });
    flow.tap();
    expect(act.play).toHaveBeenLastCalledWith(1);
    flow.stopReached(1);
    expect(flow.view).toMatchObject({ state: "paused:1", finished: true });
    flow.tap();
    expect(flow.view.state).toBe("reading");
    flow.tap(); // nothing behind the letter answers
    expect(flow.view.state).toBe("reading");
    flow.closeLetter();
    expect(flow.view.state).toBe("paused:1");
  });

  it("kicks a held-back film instead of skipping while a chapter plays", () => {
    const { flow, act } = make();
    flow.loaded();
    flow.found();
    flow.tap();
    expect(act.kick).toHaveBeenCalled();
    expect(flow.view.state).toBe("playing:0");
  });

  it("pauses when the card leaves the view and picks up where it was when it comes back", () => {
    const { flow, act } = make();
    flow.loaded();
    flow.found();
    flow.lost();
    expect(act.pause).toHaveBeenCalled();
    expect(flow.view).toMatchObject({
      phase: "scanning",
      frame: true,
      dots: false,
    });
    flow.found();
    expect(act.resume).toHaveBeenCalled();
    expect(flow.view.state).toBe("playing:0");
    flow.stopReached(0);
    flow.lost();
    flow.found();
    expect(flow.view).toMatchObject({
      state: "paused:0",
      hint: "Tap for the photo",
    });
  });

  it("keeps playing while pinned, without the card, and goes back to looking when unpinned out of view", () => {
    const { flow, act } = make();
    flow.loaded();
    flow.found();
    flow.stopReached(0);
    flow.pinned(true);
    flow.lost();
    expect(flow.view.state).toBe("paused:0");
    expect(act.pause).not.toHaveBeenCalled();
    flow.pinned(false);
    expect(flow.view.phase).toBe("scanning");
  });

  it("replays from the start, stops back to idle, falls back and fails with a message", () => {
    const { flow, act } = make();
    flow.loaded();
    flow.found();
    flow.stopReached(1);
    flow.replay();
    expect(act.play).toHaveBeenLastCalledWith(0);
    flow.stopped();
    expect(flow.view).toMatchObject({
      phase: "idle",
      found: false,
      dots: false,
    });
    flow.fallback();
    expect(flow.view.phase).toBe("fallback");
    flow.fail("broken");
    expect(flow.view).toMatchObject({ phase: "error", error: "broken" });
  });
});
