/* The player's flow, apart from any screen: where the act is (looking for the card, playing a chapter, waiting at a
   stop, the letter open) and what a tap does next. The page shows what `view` says and the act does what `act` is told.
   window.__state (tests, the Studio) is `view.state`: loading, idle, starting, scanning, found, playing:<i>,
   paused:<i>, reading, fallback or error. */
import type { Chapter } from "./template";

export interface FlowAct {
  play(chapter: number): void;
  pause(): void;
  resume(): void;
  /** a film the browser would not start on its own starts with a tap */
  kick?(): void;
}

export type Phase =
  | "loading"
  | "idle"
  | "starting"
  | "scanning"
  | "found"
  | "playing"
  | "paused"
  | "reading"
  | "fallback"
  | "error";

export interface FlowView {
  phase: Phase;
  state: string;
  /** -1 before the first chapter */
  chapter: number;
  chapters: number;
  /** the card is in view (the preview counts as always in view) */
  found: boolean;
  pinned: boolean;
  /** the act's stops are over: the next tap opens the letter */
  finished: boolean;
  /** the words at the bottom of the screen, or null for none */
  hint: string | null;
  /** the dashed frame that asks for the card */
  frame: boolean;
  /** the chapter dots */
  dots: boolean;
  error: string | null;
}

export const LOOKING = "Looking for the card";

export class Flow {
  private v: FlowView;
  private playing = false;

  /** looking: the hint while the camera looks for the card (the page's language) */
  constructor(
    private readonly chapters: Chapter[],
    private readonly act: FlowAct,
    private readonly onChange: (v: FlowView) => void,
    private readonly looking: string = LOOKING,
  ) {
    this.v = {
      phase: "loading",
      state: "loading",
      chapter: -1,
      chapters: chapters.length,
      found: false,
      pinned: false,
      finished: false,
      hint: null,
      frame: false,
      dots: false,
      error: null,
    };
  }

  get view(): FlowView {
    return this.v;
  }
  get isPlaying(): boolean {
    return this.playing;
  }

  private set(next: Partial<FlowView>) {
    const v = { ...this.v, ...next };
    v.state =
      v.phase === "playing" || v.phase === "paused"
        ? `${v.phase}:${v.chapter}`
        : v.phase;
    this.v = v;
    this.onChange(v);
  }

  private stopHint(): string {
    const last = this.chapters[this.chapters.length - 1];
    return this.v.finished
      ? last.hint
      : this.chapters[Math.max(0, this.v.chapter)].hint;
  }

  /** the card and its template are in: the page waits for "Start" */
  loaded() {
    this.set({ phase: "idle" });
  }

  /** the camera (or the preview) is starting */
  starting() {
    this.set({
      phase: "starting",
      hint: this.looking,
      frame: true,
      dots: false,
      error: null,
    });
  }

  /** the camera runs and looks for the card */
  scanning() {
    this.set({
      phase: "scanning",
      hint: this.looking,
      frame: true,
      dots: false,
      found: false,
    });
  }

  /** the card came into view (the preview: the act stands ready) */
  found() {
    if (this.v.pinned) return this.set({ found: true });
    if (this.v.chapter < 0) {
      this.set({ found: true });
      return this.playChapter(0);
    }
    if (this.playing) {
      this.act.resume();
      return this.set({
        phase: "playing",
        found: true,
        hint: null,
        frame: false,
        dots: true,
      });
    }
    this.set({
      phase: "paused",
      found: true,
      hint: this.stopHint(),
      frame: false,
      dots: true,
    });
  }

  /** the card left the view: the act waits until it is back (not while pinned: it stays where it was put) */
  lost() {
    if (this.v.pinned) return this.set({ found: false });
    this.act.pause();
    this.set({
      phase: "scanning",
      found: false,
      hint: this.looking,
      frame: true,
      dots: false,
    });
  }

  pinned(on: boolean) {
    if (on) {
      this.set({
        pinned: true,
        frame: false,
        dots: true,
        ...(this.playing ? {} : { hint: this.stopHint() }),
      });
      return;
    }
    this.set({ pinned: false });
    if (!this.v.found && this.v.phase !== "idle") {
      this.act.pause();
      this.set({
        phase: "scanning",
        hint: this.looking,
        frame: true,
        dots: false,
      });
    }
  }

  playChapter(i: number) {
    this.playing = true;
    this.set({
      phase: "playing",
      chapter: i,
      finished: false,
      hint: null,
      frame: false,
      dots: true,
    });
    this.act.play(i);
  }

  /** a chapter reached its stop: wait there for a tap */
  stopReached(i: number) {
    this.playing = false;
    const c = this.chapters[i];
    const finished = !!c && (c.reveal || i === this.chapters.length - 1);
    this.set({
      phase: "paused",
      chapter: i,
      finished,
      hint: c ? c.hint : null,
    });
  }

  /** a tap on the act: play on, open the letter after the last stop, or start a film the browser held back */
  tap() {
    if (!(this.v.found || this.v.pinned) || this.v.phase === "reading") return;
    if (this.playing) {
      this.act.kick?.();
      return;
    }
    if (this.v.finished) return this.set({ phase: "reading" });
    if (this.v.chapter + 1 < this.chapters.length)
      this.playChapter(this.v.chapter + 1);
  }

  replay() {
    this.playChapter(0);
  }

  closeLetter() {
    this.set({ phase: "paused" });
  }

  /** the camera stopped: back to the start page */
  stopped() {
    this.playing = false;
    this.act.pause();
    this.set({
      phase: "idle",
      found: false,
      pinned: false,
      hint: null,
      frame: false,
      dots: false,
    });
  }

  fallback() {
    this.playing = false;
    this.set({ phase: "fallback", hint: null, frame: false, dots: false });
  }

  fail(message: string) {
    this.playing = false;
    this.set({
      phase: "error",
      error: message,
      hint: null,
      frame: false,
      dots: false,
    });
  }
}
