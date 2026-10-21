"use client";
/* The shop's preview of a card being written: the act on a virtual card inside its box, playing through its stops by
   itself and starting over, turned with a finger. It rebuilds the act half a second after the card stops changing,
   keeping the view where the buyer left it. Browser only: the LivePreview wrapper loads this with ssr: false. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Card } from "@/lib/player/core/card";
import { CardSession } from "@/lib/player/engine/session";
import type { View } from "@/lib/player/engine/preview";
import type { Act } from "@/lib/player/engine/types";
import { fontVars } from "./fonts";
import s from "./liveClasses";
import { LoadError, loadTemplateFor, type Loaded } from "./loadTemplate";
import { T } from "./strings";
import type { LivePreviewProps } from "./types";
import { cx } from "./ui";
import { useActFlow } from "./useActFlow";
import { useGestures } from "./useGestures";

const AT_STOP_MS = 1500;
const AT_END_MS = 3000;
const SETTLE_MS = 500;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** the card's content, settled: changes reach the act once the buyer pauses */
function useSettled(card: Card): string {
  const key = useMemo(() => JSON.stringify(card), [card]);
  const [settled, setSettled] = useState(key);
  useEffect(() => {
    if (key === settled) return;
    const t = setTimeout(() => setSettled(key), SETTLE_MS);
    return () => clearTimeout(t);
  }, [key, settled]);
  return settled;
}

export default function LivePreviewView({
  card,
  className,
  autoplay = true,
  onEvent,
}: LivePreviewProps) {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [domRoot, setDomRoot] = useState<HTMLDivElement | null>(null);
  const [session, setSession] = useState<CardSession | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const lastView = useRef<View | null>(null);
  /** each act is put on the card once; every run of the effect (StrictMode runs it twice) waits for that */
  const startFor = useRef<{ act: Act; put: Promise<void> } | null>(null);
  const announced = useRef(false);
  const emit = useRef(onEvent);
  useEffect(() => {
    emit.current = onEvent;
  });

  const settled = useSettled(card);
  useEffect(() => {
    const ac = new AbortController();
    loadTemplateFor(JSON.parse(settled) as Card, {
      fallbackHint: T.tapToContinue,
      missing: T.templateMissing,
      signal: ac.signal,
    }).then(
      (l) => {
        setLoadError(null);
        setLoaded(l);
      },
      (e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setLoadError(e instanceof LoadError ? e.message : T.templateMissing);
      },
    );
    return () => ac.abort();
  }, [settled]);

  // the stage's box mounts: a session on it, gone with it
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const sess = new CardSession(el, "card");
    setSession(sess);
    return () => {
      sess.dispose();
      setSession(null);
    };
  }, []);

  const onReveal = useCallback(
    (up: boolean) => {
      const p = session?.preview;
      if (!p) return;
      if (up) p.frameFilm(true);
      else if (p.view.lift) p.frameFilm(false);
    },
    [session],
  );
  const { flow, act, view, error } = useActFlow(session, loaded, domRoot, {
    looking: T.loading,
    failed: T.sceneFailed,
    onReveal,
    onStop: (i) => emit.current?.("chapter_reached", { chapter: i }),
  });

  // each new act: put it on the virtual card (where the buyer last turned it), once, and play from the start when it is
  // ready. The run depends on the act only (not on the flow's phase, which starting() itself changes), and a cancelled
  // run (the act changed, or StrictMode's second run) leaves the putting to the one that follows.
  useEffect(() => {
    if (!session || !flow || !act || !loaded) return;
    let cancelled = false;
    if (startFor.current?.act !== act) {
      startFor.current = {
        act,
        put: (async () => {
          if (session.preview) lastView.current = { ...session.preview.view };
          const p = session.startPreview(
            loaded.kind,
            loaded.tpl.aspect,
            () => {},
          );
          if (lastView.current)
            p.setView({
              azimuth: lastView.current.azimuth,
              elevation: lastView.current.elevation,
              distance: lastView.current.distance,
            });
          setRunning(false);
          await act.unlock();
          flow.starting();
        })(),
      };
    }
    const { put } = startFor.current;
    (async () => {
      await put;
      await Promise.race([act.ready, wait(8000)]);
      if (cancelled || flow.view.phase !== "starting") return;
      setRunning(true);
      flow.found();
      if (!announced.current) {
        announced.current = true;
        emit.current?.("preview_mode");
      }
    })().catch((e: unknown) => {
      if (cancelled) return;
      console.error("[preview] the act did not start", e);
      flow.fail(T.sceneFailed);
    });
    return () => {
      cancelled = true;
    };
  }, [session, flow, act, loaded]);

  // play on by itself: a short wait at each stop, a longer one after the last, then from the start
  useEffect(() => {
    if (!autoplay || !flow || view?.phase !== "paused") return;
    const t = setTimeout(
      () => {
        if (view.finished) flow.replay();
        else flow.tap();
      },
      view.finished ? AT_END_MS : AT_STOP_MS,
    );
    return () => clearTimeout(t);
  }, [autoplay, flow, view?.phase, view?.chapter, view?.finished]);

  const tap = useCallback(() => {
    if (!flow) return;
    if (flow.view.finished && !flow.isPlaying) flow.replay();
    else flow.tap(); // the shop shows the letter beside it, not over it
  }, [flow]);
  const replay = useCallback(() => {
    session?.level();
    flow?.replay();
  }, [session, flow]);

  useGestures({
    element: box,
    session,
    running,
    live: running,
    kind: loaded?.kind ?? null,
    zoom: false,
    onTap: tap,
  });

  const message =
    loadError ?? error ?? (view?.phase === "error" ? view.error : null);
  const busy = !message && (!running || !view || view.phase === "starting");
  const hint = view && view.phase === "paused" && !autoplay ? view.hint : null;

  return (
    <div
      ref={setBox}
      className={cx(s.box, fontVars, className)}
      role="group"
      aria-label={T.previewLabel}
      data-preview-state={message ? "error" : (view?.state ?? "loading")}
    >
      <div className={s.stage} ref={stageRef} />
      <div className={s.filmDom} ref={setDomRoot} aria-hidden="true" />
      <div
        className={cx(
          s.status,
          message && s.error,
          !busy && !message && s.statusHidden,
        )}
        aria-live="polite"
      >
        {message ?? (busy ? T.loading : "")}
      </div>
      {running && !message && (
        <div className={s.bar}>
          {hint ? (
            <span className={s.hint}>{hint}</span>
          ) : (
            <span className={s.hint}>{T.previewHint}</span>
          )}
          <button type="button" className={s.replay} onClick={replay}>
            {T.replay}
          </button>
        </div>
      )}
    </div>
  );
}
