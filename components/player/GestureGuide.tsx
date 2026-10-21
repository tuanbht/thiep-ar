/* How to handle the act, in Vietnamese, with a small drawing for each gesture. It opens by itself when the act first
   comes up (the camera found the card and pinned it, or the preview started) and again from the top bar's "?". What it
   lists follows what useGestures does in that mode. */
import type { ReactNode } from "react";
import s from "./playerClasses";
import { T } from "./strings";

export type GestureIcon =
  "turn" | "tip" | "move" | "size" | "orbit" | "tap" | "photo";

export interface GuideRow {
  icon: GestureIcon;
  text: string;
}

/** What the fingers do: the camera or the preview, a 3D act or a film, pinned or following the card; `photos`: a tap
    on a photo shows it big (a 3D act with the buyer's photos). */
export function guideRows(o: {
  mode: "ar" | "preview";
  kind: "3d" | "film";
  pinned: boolean;
  photos: boolean;
}): GuideRow[] {
  const tap: GuideRow[] = [
    { icon: "tap", text: T.guideTap },
    ...(o.photos ? [{ icon: "photo" as const, text: T.guidePhoto }] : []),
  ];
  if (o.mode === "preview")
    return [
      { icon: "orbit", text: T.guideOrbit },
      { icon: "size", text: T.guideZoom },
      ...tap,
    ];
  if (o.kind === "film")
    return o.pinned
      ? [
          { icon: "move", text: T.guideMoveOne },
          { icon: "size", text: T.guideSize },
          ...tap,
        ]
      : tap;
  return [
    { icon: "turn", text: T.guideTurn },
    { icon: "tip", text: T.guideTip },
    ...(o.pinned
      ? [
          { icon: "move" as const, text: T.guideMove },
          { icon: "size" as const, text: T.guideSize },
        ]
      : []),
    ...tap,
  ];
}

/** a fingertip (a soft dot) with what it does: arrows for a drag, rings for a tap */
function Icon({ icon }: { icon: GestureIcon }) {
  const dot = (x: number, y: number) => (
    <circle cx={x} cy={y} r="3.2" fill="currentColor" stroke="none" />
  );
  const draw: Record<GestureIcon, ReactNode> = {
    turn: (
      <>
        {dot(16, 16)}
        <path d="M5 16h6M5 16l3-3M5 16l3 3M27 16h-6M27 16l-3-3M27 16l-3 3" />
      </>
    ),
    tip: (
      <>
        {dot(16, 16)}
        <path d="M16 5v6M16 5l-3 3M16 5l3 3M16 27v-6M16 27l-3-3M16 27l3-3" />
      </>
    ),
    move: (
      <>
        {dot(11, 19)}
        {dot(17, 21)}
        <path d="M18 13l7-7M25 6h-5M25 6v5" />
      </>
    ),
    size: (
      <>
        {dot(12, 20)}
        {dot(20, 12)}
        <path d="M9 23l-4 4M5 27h4M5 27v-4M23 9l4-4M27 5h-4M27 5v4" />
      </>
    ),
    orbit: (
      <>
        {dot(16, 20)}
        <path d="M6 13c3-5 17-5 20 0M26 13l-1-4M26 13l-4-1" />
      </>
    ),
    tap: (
      <>
        {dot(16, 16)}
        <circle cx="16" cy="16" r="7" opacity=".55" />
        <circle cx="16" cy="16" r="11.5" opacity=".3" />
      </>
    ),
    photo: (
      <>
        <rect x="5" y="6" width="17" height="14" rx="1.5" />
        <path d="M7 17l4-4 3 3 2-2 4 3" />
        {dot(22, 23)}
        <circle cx="22" cy="23" r="6" opacity=".45" />
      </>
    ),
  };
  return (
    <svg
      className={s.guideIcon}
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {draw[icon]}
    </svg>
  );
}

export function GestureGuide(p: {
  mode: "ar" | "preview";
  kind: "3d" | "film";
  pinned: boolean;
  photos: boolean;
  onClose(): void;
}) {
  const rows = guideRows(p);
  return (
    <section className={s.guide} aria-labelledby="guide-title" data-ui>
      <h2 id="guide-title">{T.guideTitle}</h2>
      {p.mode === "ar" && p.pinned && (
        <p className={s.guideNote}>{T.guidePinned}</p>
      )}
      <ul>
        {rows.map((r) => (
          <li key={r.icon}>
            <Icon icon={r.icon} />
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      <button type="button" className={s.btn} onClick={p.onClose} autoFocus>
        {T.guideOk}
      </button>
    </section>
  );
}
