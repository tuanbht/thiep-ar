/* One finger on a 3D act in camera mode: across turns it round, up or down tips it towards you or away. Each drag does
   one or the other, whichever way it starts, so turning it does not tip it by accident. */

export type DragAxis = 'turn' | 'tip';

/** A drag counts once it has moved this far (px); before that it may still be a tap. */
export const DRAG_START = 6;

export const pickAxis = (dx: number, dy: number): DragAxis => (Math.abs(dx) >= Math.abs(dy) ? 'turn' : 'tip');

/** A full screen width is one full turn. */
export const turnAngle = (dx: number, width: number): number => (dx * 2 * Math.PI) / Math.max(1, width);

/** A full screen height is half a turn; down tips the top towards you (you see more of it from above). */
export const tipAngle = (dy: number, height: number): number => (dy * Math.PI) / Math.max(1, height);

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
