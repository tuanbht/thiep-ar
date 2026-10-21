/* The buyer's photos around the card while it plays, in the space the act leaves: a row of polaroids below the act on
   a phone held upright, two at each side on a wide screen. With more photos than polaroids, one polaroid at a time
   turns to the next photo, so every photo comes round. Decoration only: the letter lists them all. */
import { useCallback, useEffect, useMemo, useState } from "react";
import s from "./playerClasses";

/** how many polaroids show at most */
export const STRIP_SIZE = 4;
/** ms between one polaroid turning and the next */
export const TURN_MS = 2600;

/** The photos that load; one that fails (its link ran out in a tab left open) is left out. */
export function useWorkingPhotos(
  photos: readonly string[],
): [string[], (src: string) => void] {
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const shown = useMemo(
    () => photos.filter((p) => !broken.has(p)),
    [photos, broken],
  );
  const drop = useCallback(
    (src: string) => setBroken((b) => new Set(b).add(src)),
    [],
  );
  return [shown, drop];
}

const reducedMotion = (): boolean =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Which photo polaroid `j` shows after `t` turns, with `slots` polaroids and `n` photos: the polaroids turn one at a
    time, each to the next photo in line, so all of them come round and no two polaroids show the same one. */
export function photoAt(
  j: number,
  t: number,
  slots: number,
  n: number,
): number {
  if (t < j + 1) return j % n;
  const k = j + 1 + Math.floor((t - j - 1) / slots) * slots;
  return (slots - 1 + k) % n;
}

export function PhotoStrip({ photos }: { photos: readonly string[] }) {
  const [shown, drop] = useWorkingPhotos(photos);
  const n = shown.length,
    slots = Math.min(n, STRIP_SIZE);
  const [turns, setTurns] = useState(0);
  useEffect(() => {
    if (n <= slots || reducedMotion()) return; // every photo shows already, or nothing should move
    const t = setInterval(() => setTurns((k) => k + 1), TURN_MS);
    return () => clearInterval(t);
  }, [n, slots]);

  if (!slots) return null;
  return (
    <div className={s.photoStrip} aria-hidden="true">
      {Array.from({ length: slots }, (_, j) => {
        const src = shown[photoAt(j, turns, slots, n)];
        return (
          <span key={j} className={s.stripPhoto}>
            {/* eslint-disable-next-line @next/next/no-img-element -- the buyer's photo, from a short-lived signed link */}
            <img key={src} src={src} alt="" onError={() => drop(src)} />
          </span>
        );
      })}
    </div>
  );
}

/** Up to three of the buyer's photos fanned over the card's picture on the opening screen. */
export function PhotoFan({ photos }: { photos: readonly string[] }) {
  const [shown, drop] = useWorkingPhotos(photos);
  if (!shown.length) return null;
  return (
    <div className={s.photoFan} aria-hidden="true">
      {shown.slice(0, 3).map((src) => (
        <span key={src}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the buyer's photo, from a short-lived signed link */}
          <img src={src} alt="" onError={() => drop(src)} />
        </span>
      ))}
    </div>
  );
}
