/* The gift player's screens and overlays. Presentational only: what they show comes in as props. Anything a tap must
   not pass through to the act carries data-ui. */
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import type { Card } from "@/lib/player/core/card";
import { PhotoFan, useWorkingPhotos } from "./PhotoStrip";
import s from "./playerClasses";
import { T, type Words } from "./strings";
import Image from "next/image";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

export function Letter({
  card,
  id,
  focusable,
}: {
  card: Card;
  id?: string;
  focusable?: boolean;
}) {
  return (
    <article
      className={s.letter}
      id={id}
      data-ui
      tabIndex={focusable ? -1 : undefined}
    >
      <LetterPhotos photos={card.photos} />
      <h2>{card.letter.to}</h2>
      {card.letter.body.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
      <p className={s.from}>{card.letter.from}</p>
    </article>
  );
}

/** The letter's photos: one wide, or several in a strip. They are the buyer's own, from signed links that last an hour,
    so no next/image optimisation for them; one that will not load (its link ran out in a tab left open) is left out. */
function LetterPhotos({ photos }: { photos: readonly string[] }) {
  const [shown, drop] = useWorkingPhotos(photos);
  /* eslint-disable @next/next/no-img-element */
  if (shown.length === 1)
    return <img src={shown[0]} alt="" onError={() => drop(shown[0])} />;
  if (!shown.length) return null;
  return (
    <div className={s.photos}>
      {shown.map((p, i) => (
        <img key={`${i}-${p}`} src={p} alt="" onError={() => drop(p)} />
      ))}
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}

/** The letter over the act: it takes the focus when it opens (a screen reader reads it, the keys scroll it) and Escape
    closes it, as its button does. */
export function ReadView({ card, onClose }: { card: Card; onClose(): void }) {
  const box = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("#letter-read")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <section
      ref={box}
      className={cx(s.ui, s.read)}
      role="dialog"
      aria-label={T.letterTitle}
      data-ui
    >
      <Letter card={card} id="letter-read" focusable />
      <button
        className={cx(s.btn, s.ghost)}
        id="close"
        type="button"
        onClick={onClose}
      >
        {T.backToCard}
      </button>
    </section>
  );
}

const IN_APP =
  /Zalo|FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Snapchat/i;

export function Intro(p: {
  title: string;
  template: string;
  lead: string;
  ready: boolean;
  onStart(): void;
  onNoCamera(): void;
  /** the theme's words (default the player's own) */
  words?: Words;
  /** the buyer's photos, fanned over the card's picture */
  photos?: readonly string[];
}) {
  const W = p.words ?? T;
  const inApp =
    typeof navigator !== "undefined" && IN_APP.test(navigator.userAgent);
  return (
    <section className={s.ui} aria-label={p.title} data-ui>
      <div className={s.introArt}>
        <Image
          src={`/thumbs/${p.template}.jpg`}
          alt=""
          width={960}
          height={600}
          sizes={"(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"}
          className="aspect-[16/10] h-auto w-full max-w-240 object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] motion-safe:group-hover:scale-[1.04]"
        />
        <PhotoFan photos={p.photos ?? []} />
      </div>
      <p className={s.eyebrow}>{W.eyebrow}</p>
      <h1 className={s.title} id="title">
        {p.title}
      </h1>
      {p.lead && (
        <p className={s.lead} id="lead">
          {p.lead}
        </p>
      )}
      {inApp && (
        <div className={s.warn} id="inapp">
          <b>{T.inAppTitle}</b> {T.inAppBody}
          <code id="link">
            {typeof location !== "undefined" ? location.href : ""}
          </code>
        </div>
      )}
      <button
        className={s.btn}
        id="start"
        type="button"
        onClick={p.onStart}
        disabled={!p.ready}
        aria-busy={!p.ready}
      >
        {p.ready ? W.start : W.loading}
      </button>
      <button
        className={cx(s.btn, s.ghost)}
        id="nocam"
        type="button"
        onClick={p.onNoCamera}
        disabled={!p.ready}
      >
        {T.noCamera}
      </button>
    </section>
  );
}

export function TopBar({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className={s.top} id="top" data-ui>
      <span id="brand">{title}</span>
      <span>{children}</span>
    </header>
  );
}

/** The words at the bottom. While the act waits at a stop they are a button (what a tap anywhere does), so the keys and
    a screen reader can play on too. The live region stays mounted, so each new hint is announced. `autoFocus`: the
    last stop was passed with the keys, so this one takes the focus. */
export function Hint({
  text,
  onActivate,
  autoFocus,
}: {
  text: string | null;
  onActivate?: (e: MouseEvent<HTMLButtonElement>) => void;
  autoFocus?: boolean;
}) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {text && (
        <p className={s.hint} id="hint">
          {onActivate ? (
            <button
              type="button"
              onClick={onActivate}
              autoFocus={autoFocus}
              data-ui
            >
              {text}
            </button>
          ) : (
            <span>{text}</span>
          )}
        </p>
      )}
    </div>
  );
}

export const ScanFrame = ({ on }: { on: boolean }) =>
  on ? <div className={s.frame} id="frame" aria-hidden="true" /> : null;

export function Dots({
  count,
  chapter,
  on,
}: {
  count: number;
  chapter: number;
  on: boolean;
}) {
  if (!on || count < 2) return null;
  return (
    <div className={s.dots} id="dots" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          className={i < chapter ? s.done : i === chapter ? s.on : ""}
        />
      ))}
    </div>
  );
}

export function Fallback(p: {
  card: Card;
  why: string;
  film: string;
  onRetry(): void;
  /** the theme's words (default the player's own) */
  words?: Words;
}) {
  const W = p.words ?? T;
  return (
    <section
      className={cx(s.ui, s.fallback)}
      id="fallback"
      aria-label={W.letterTitle}
      data-ui
    >
      <p className={s.eyebrow}>{p.card.title}</p>
      <h1 className={cx(s.title, s.titleSmall)}>{W.letterTitle}</h1>
      <p className={s.lead} id="why">
        {p.why}
      </p>
      <video id="flat" controls playsInline muted loop autoPlay>
        <source src={`${p.film}.mp4`} type="video/mp4" />
        <source src={`${p.film}.webm`} type="video/webm" />
      </video>
      <Letter card={p.card} id="letter-flat" />
      <button
        className={cx(s.btn, s.ghost)}
        id="retry"
        type="button"
        onClick={p.onRetry}
      >
        {T.retry}
      </button>
    </section>
  );
}

export const ErrorView = ({ message }: { message: string }) => (
  <div className={s.err} id="err" role="alert" data-ui>
    <p className={s.lead} id="err-text">
      {message}
    </p>
  </div>
);

export { cx };
