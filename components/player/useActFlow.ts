/* The act for a loaded card on a session, and the flow that drives it. A new card disposes the old act and builds
   the new one; the flow starts at "idle". */
import { useEffect, useRef, useState } from 'react';
import { Flow, type FlowView } from '@/lib/player/core/flow';
import { actMiddle } from '@/lib/player/core/template';
import { createAct3d, type Act3d } from '@/lib/player/engine/act3d';
import { createFilmAct } from '@/lib/player/engine/filmAct';
import type { CardSession } from '@/lib/player/engine/session';
import type { Act, FilmAct } from '@/lib/player/engine/types';
import type { Loaded } from './loadTemplate';

export interface ActFlow {
  flow: Flow | null;
  act: Act | null;
  view: FlowView | null;
  error: string | null;
}

export interface ActFlowOptions {
  /** the hint while the camera looks for the card */
  looking: string;
  /** what to say when the act cannot be built */
  failed: string;
  /** a chapter reached its stop */
  onStop?(chapter: number): void;
  /** the envelope rose (true) or was put away (false) */
  onReveal?(up: boolean): void;
}

export function useActFlow(session: CardSession | null, loaded: Loaded | null, domRoot: HTMLElement | null, o: ActFlowOptions): ActFlow {
  const [state, setState] = useState<ActFlow>({ flow: null, act: null, view: null, error: null });
  const opts = useRef(o);
  useEffect(() => { opts.current = o; });

  useEffect(() => {
    if (!session || !loaded || !domRoot) return;
    let cancelled = false, act: Act | null = null;
    const flowRef: { flow: Flow | null } = { flow: null };
    const onStop = (i: number) => { flowRef.flow?.stopReached(i); opts.current.onStop?.(i); };
    (async () => {
      session.prepareFor(loaded.kind);
      act = loaded.kind === '3d'
        ? await createAct3d({ card: loaded.card, tpl: loaded.tpl, tdir: loaded.tdir, onStop })
        : createFilmAct({ card: loaded.card, tpl: loaded.tpl, tdir: loaded.tdir, slots: loaded.slots, chapters: loaded.chapters,
            host: session.frame, domRoot, onStop, onReveal: up => opts.current.onReveal?.(up) });
      if (cancelled) { act.dispose(); return; }
      session.setAct(act, actMiddle(loaded.tpl));
      const a = act;
      const flow = new Flow(loaded.chapters, { play: i => a.play(i), pause: () => a.pause(), resume: () => a.resume(),
        kick: () => (a as FilmAct).kick?.() }, view => { if (!cancelled) setState(s => ({ ...s, view })); }, opts.current.looking);
      flowRef.flow = flow;
      setState({ flow, act: a, view: flow.view, error: null });
      flow.loaded();
      // a scene keeps going when its model or character does not load (ready still resolves; modelError says why):
      // say so instead of playing an empty stage, wherever the act is (preview, camera, the shop's box)
      a.ready.then(() => (isAct3d(a) ? a.api.modelError?.() ?? null : null), (e: unknown) => (e instanceof Error ? e.message : 'the act did not load'))
        .then(problem => {
          if (!problem || cancelled) return;
          console.error('[player] the act did not load:', problem);
          setState(st => ({ ...st, error: opts.current.failed }));
        });
    })().catch((e: unknown) => {
      if (cancelled) return;
      console.error('[player] the act could not be built', e);
      setState({ flow: null, act: null, view: null, error: opts.current.failed });
    });
    return () => {
      cancelled = true;
      if (act && session.currentAct === act) session.clearAct();
      else act?.dispose();
      setState({ flow: null, act: null, view: null, error: null });
    };
  }, [session, loaded, domRoot]);

  return state;
}

export const isAct3d = (a: Act | null): a is Act3d => !!a && a.kind === '3d';
