'use client';
/* The gift: the start screen, then the act on the printed card with the camera (a 3D act faces the phone) or on a
   virtual card without it; the hints, the chapter dots, pin, replay, and the letter at the end. Browser only: the
   GiftPlayer wrapper loads this with ssr: false. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { targetsUrl } from '@/lib/player/core/template';
import type { Placement } from '@/lib/player/core/placement';
import { CardSession, type Mode } from '@/lib/player/engine/session';
import type { Act, FilmAct } from '@/lib/player/engine/types';
import { fontVars } from './fonts';
import { LoadError, loadTemplateFor, type Loaded } from './loadTemplate';
import s from './playerClasses';
import { T } from './strings';
import type { GiftPlayerProps } from './types';
import { cx, Dots, ErrorView, Fallback, Hint, Intro, ReadView, ScanFrame, TopBar } from './ui';
import { isAct3d, useActFlow } from './useActFlow';
import { useGestures } from './useGestures';

declare global {
  interface Window {
    __state?: string;
    __mode?: string;
    __card?: unknown;
    __drawWords?: (frame: number) => void;
    __scene?: unknown;
    __pinned?: boolean;
    __stage?: { tipDegrees(): number; actUp(): [number, number, number] | null; placement: Placement; level(): void };
  }
}

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** the tests' hooks on window (scenes' checks, e2e): never in a production build */
const TEST_HOOKS = process.env.NODE_ENV !== 'production';

export default function GiftPlayerView({ card, initialMode = 'ar', onEvent }: GiftPlayerProps) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [domRoot, setDomRoot] = useState<HTMLDivElement | null>(null);
  const [session, setSession] = useState<CardSession | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [running, setRunning] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [why, setWhy] = useState('');
  /** the stops are being passed with the keys: each new stop's button takes the focus */
  const [keys, setKeys] = useState(false);
  /** the act the preview was started for (a new act, e.g. after a remount, starts its own) */
  const previewFor = useRef<Act | null>(null);
  const emit = useRef(onEvent);
  useEffect(() => { emit.current = onEvent; });

  // the template, once per card's content
  const cardKey = useMemo(() => JSON.stringify(card), [card]);
  useEffect(() => {
    const ac = new AbortController();
    const c = JSON.parse(cardKey) as typeof card;
    loadTemplateFor(c, { fallbackHint: T.tapToContinue, missing: T.templateMissing, signal: ac.signal })
      .then(setLoaded, (e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setLoadError(e instanceof LoadError ? e.message : T.templateMissing);
      });
    return () => ac.abort();
  }, [cardKey]);

  // the stage's box mounts: a session on it, gone with it
  const stageRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const sess = new CardSession(el, 'face');
    setSession(sess);
    return () => { sess.dispose(); setSession(null); };
  }, []);

  const onReveal = useCallback((up: boolean) => {
    const p = session?.preview;
    if (!p) return;
    if (up) p.frameFilm(true);
    else if (p.view.lift) p.frameFilm(false);
  }, [session]);
  const { flow, act, view, error } = useActFlow(session, loaded, domRoot, {
    looking: T.looking, failed: T.sceneFailed, onReveal,
    onStop: i => emit.current?.('chapter_reached', { chapter: i })
  });
  const kind = loaded?.kind ?? null;

  const startPreview = useCallback(async () => {
    if (!session || !flow || !act || !loaded || previewFor.current === act) return;
    previewFor.current = act;
    setMode('preview'); setPinned(false);
    session.startPreview(loaded.kind, loaded.tpl.aspect, () => {});
    emit.current?.('preview_mode');
    try {
      await act.unlock();
      flow.starting();
      setRunning(true);
      await Promise.race([act.ready, wait(8000)]);               // a model starts dancing once it stands on the card
      if (previewFor.current !== act || session.mode !== 'preview') return;   // the camera (or another act) took over meanwhile
      flow.found();
    } catch (e) {
      console.error('[player] the act did not start', e);
      flow.fail(T.sceneFailed);
    }
  }, [session, flow, act, loaded]);

  const showFallback = useCallback((reason: string) => {
    if (kind === '3d') { void startPreview(); return; }           // a 3D act has no film to fall back to: it plays without the camera
    session?.stopCamera();
    setRunning(false);
    setWhy(reason);
    flow?.fallback();
  }, [kind, startPreview, session, flow]);

  const start = useCallback(async () => {
    if (!session || !flow || !act || !loaded) return;
    if (!navigator.mediaDevices?.getUserMedia) return showFallback(T.noCameraApi);
    await act.unlock();                                           // iOS: a video may only start inside the tap
    previewFor.current = null;
    setMode('ar');
    flow.starting();
    setRunning(true);
    try {
      await session.startCamera(targetsUrl(loaded.tdir, loaded.card), {
        onFound: () => { flow.found(); emit.current?.('card_found'); },
        onLost: () => flow.lost()
      });
      if (session.mode !== 'ar') return;                          // stopped while it was starting
      if (flow.view.phase === 'starting') flow.scanning();
      emit.current?.('ar_start');
    } catch (e) {
      console.error('[player] the camera did not start', e);
      showFallback(T.cameraFailed);
    }
  }, [session, flow, act, loaded, showFallback]);

  const stopCamera = useCallback(() => {
    session?.stopCamera();
    setPinned(false);
    setRunning(false);
    flow?.stopped();
  }, [session, flow]);

  const togglePin = useCallback(async () => {
    if (!session || !flow) return;
    if (session.pinned) { session.unpin(); setPinned(false); flow.pinned(false); return; }
    if (await session.pin()) { setPinned(true); flow.pinned(true); }
  }, [session, flow]);

  const replay = useCallback(() => { session?.level(); flow?.replay(); }, [session, flow]);
  /** the hint's button: a keyboard press (detail 0) keeps the focus moving with the stops */
  const playOn = useCallback((e: { detail: number }) => { setKeys(e.detail === 0); flow?.tap(); }, [flow]);

  // the preview starts on its own when the page asks for it
  useEffect(() => {
    if (initialMode !== 'preview' || view?.phase !== 'idle') return;
    void Promise.resolve().then(startPreview);                   // after this render, not inside it
  }, [initialMode, view?.phase, startPreview]);
  useEffect(() => { if (view?.phase === 'reading') emit.current?.('letter_open'); }, [view?.phase]);

  useGestures({ element: root, session, running, live: !!view && (view.found || view.pinned), kind, zoom: true, onTap: () => flow?.tap() });

  // hooks for the tests
  useEffect(() => { if (TEST_HOOKS) window.__state = view?.state ?? (error || loadError ? 'error' : 'loading'); }, [view?.state, error, loadError]);
  useEffect(() => { if (TEST_HOOKS) window.__mode = mode; }, [mode]);
  useEffect(() => {
    if (!TEST_HOOKS) return;
    window.__card = loaded?.card;
    window.__drawWords = act && act.kind === 'film' ? (f: number) => (act as FilmAct).drawWords(f) : undefined;
    window.__scene = isAct3d(act) ? act.api : undefined;
    window.__stage = session ? { tipDegrees: () => session.tipDegrees, actUp: () => session.actUp, placement: session.placement, level: () => session.level() } : undefined;
  }, [loaded, act, session]);
  useEffect(() => { if (TEST_HOOKS) window.__pinned = pinned; }, [pinned]);

  const message = loadError ?? error ?? (view?.phase === 'error' ? view.error : null);
  const phase = view?.phase ?? 'loading';
  const intro = !running && (phase === 'loading' || phase === 'idle') && !(initialMode === 'preview' && phase === 'idle');
  const title = loaded?.card.title ?? card.title;

  return (
    <div ref={setRoot} className={cx(s.root, fontVars, mode === 'preview' && running && s.preview)} data-player-state={view?.state ?? 'loading'}>
      <div className={s.stage} ref={stageRef} />
      <div className={s.filmDom} ref={setDomRoot} aria-hidden="true" />
      {message && <ErrorView message={message} />}
      {!message && intro && (
        <Intro title={title} lead={card.intro} ready={!!flow && phase === 'idle'} onStart={() => void start()}
          onNoCamera={() => (kind === '3d' ? void startPreview() : showFallback(T.filmWithoutCamera))} />
      )}
      {!message && phase === 'fallback' && loaded && <Fallback card={loaded.card} why={why} film={`${loaded.tdir}/film`} onRetry={() => void start()} />}
      {!message && running && view && loaded && (
        <>
          <TopBar title={title}>
            {mode === 'ar' && (view.found || pinned) && <button type="button" id="pin" onClick={() => void togglePin()}>{pinned ? T.unpin : T.pin}</button>}
            <button type="button" id="replay" onClick={replay}>{T.replay}</button>
            {mode === 'preview'
              ? <button type="button" id="use-camera" onClick={() => void start()}>{T.useCamera}</button>
              : <button type="button" id="stop" onClick={stopCamera}>{T.stopCamera}</button>}
          </TopBar>
          <ScanFrame on={mode === 'ar' && view.frame} />
          {phase !== 'reading' && <Hint text={view.hint} onActivate={phase === 'paused' ? playOn : undefined} autoFocus={keys} />}
          <Dots count={view.chapters} chapter={view.chapter} on={view.dots && phase !== 'reading'} />
          {phase === 'reading' && <ReadView card={loaded.card} onClose={() => flow?.closeLetter()} />}
        </>
      )}
    </div>
  );
}
