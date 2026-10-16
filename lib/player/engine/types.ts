/* What plays on the card. Every act lives in a "card frame": a THREE.Object3D whose x runs across the card, y up
   it (towards its top edge) and z out of it, with 1 = the card's width and the origin at its centre. In camera mode
   MindAR moves that frame onto the printed card; in the preview the orbit view places it in front of the camera. */
import type { Card } from '../core/card';
import type { Chapter, Template } from '../core/template';

export interface Act {
  readonly kind: 'film' | '3d';
  /** iOS lets a page start media only inside a tap: called from the tap that starts the camera */
  unlock(): Promise<void>;
  play(chapter: number): void;
  pause(): void;
  resume(): void;
  /** resolves when the act can play (a model has loaded, the words' faces are in) */
  ready: Promise<unknown>;
  /** called by the stage every frame, before rendering */
  update?(dt: number, now: number): void;
  dispose(): void;
}

/** A film template's slots.json: where each board's words go in every frame of the film. */
export interface SlotStyle {
  family: string;
  weight: number;
  italic: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  lines: number;
  upper: boolean;
  lineHeight: number;
  size: number;
  letterSpacing: number;
  stroke: number;
  shadow: string;
  balance: boolean;
}
export type SlotBox = [x: number, y: number, w: number, h: number, alpha?: number] | null;
export interface Slot {
  kind?: string;
  style?: Partial<SlotStyle>;
  text?: string;
  boxes: SlotBox[];
}
export interface Slots {
  width: number;
  height: number;
  fps: number;
  frames: number;
  font?: string;
  slots: Record<string, Slot>;
}

export interface FilmActOptions {
  card: Card;
  tpl: Template;
  /** templates/<id> */
  tdir: string;
  /** templates/<id>/slots.json, or null when the film has no words */
  slots: Slots | null;
  chapters: Chapter[];
  /** the card frame to build on */
  host: import('three').Object3D;
  /** where the film's <video id="film"> and the words' <canvas id="words"> go (tools find them by id) */
  domRoot: HTMLElement;
  /** a chapter's end second was reached: the film waits there for a tap */
  onStop(chapter: number): void;
  /** the envelope rises above the card (true) or is put away (false): the preview steps back to keep it in view */
  onReveal?(up: boolean): void;
}

export interface FilmAct extends Act {
  readonly kind: 'film';
  readonly video: HTMLVideoElement;
  /** paint the card's words for a film frame (-1 forgets the last one, so the next call paints again) */
  drawWords(frame: number): void;
  /** a film the browser would not start on its own starts with this tap */
  kick(): void;
}
