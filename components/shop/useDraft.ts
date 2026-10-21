'use client';
/* The customise form's draft (draft.ts): brought back once when the page opens, kept a moment after every change, and
   thrown away on "start over". The shop's router keeps a page it leaves (hidden, its state intact) and shows it again on
   Back, so: the draft is looked for only once per page; what was typed in the last moment is kept when the page is
   hidden or the tab closes; and a page shown again after its draft was let go (the order made from it was paid) starts
   afresh. Each photo's small preview is made from the picked file, so a reload can show it again. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormField } from '@/lib/catalog/form';
import type { CustomizeValues } from './customize';
import { clearDraft, isPristine, loadDraft, makePreview, mergeDraft, saveDraft, type DraftPhoto } from './draft';
import { hasDraft, markDraftOrdered } from './draftStore';
import type { PhotoItem } from './PhotosField';

const SAVE_AFTER_MS = 400;

export interface DraftStatus {
  /** when the draft brought back on opening was written, or null */
  restoredAt: number | null;
  /** when it was last kept, or null */
  savedAt: number | null;
  /** photos of the draft that cannot come back (too old, or kept without a preview): they must be added again */
  photosLost: number;
  /** the browser had no room for the photos: the words are kept, the photos must be added again after a reload */
  photosUnsaved: boolean;
  /** the browser would not keep it (storage full or switched off) */
  failed: boolean;
}

const IDLE: DraftStatus = { restoredAt: null, savedAt: null, photosLost: 0, photosUnsaved: false, failed: false };

export interface UseDraftOptions {
  productId: string;
  fields: FormField[];
  defaults: CustomizeValues;
  /** the form's values as watched: each change is kept a moment later */
  values: CustomizeValues;
  /** the form's values right now (what is kept) */
  read(): CustomizeValues;
  /** the form's photos, in the buyer's order */
  photos: PhotoItem[];
  /** put values and photos into the form */
  restore(values: CustomizeValues, photos: PhotoItem[]): void;
}

export interface Draft extends DraftStatus {
  /** something is written that starting over would throw away */
  dirty: boolean;
  discard(): void;
  /** the card was just ordered as it stands: paying that order lets the draft go */
  ordered(orderId: string): void;
}

export function useDraft(o: UseDraftOptions): Draft {
  const { productId, values, photos, defaults, fields } = o;
  const [status, setStatus] = useState<DraftStatus>(IDLE);
  const [previewsMade, setPreviewsMade] = useState(0);
  const opened = useRef(false);                                         // last time's draft was looked for
  const kept = useRef(new Map<string, DraftPhoto>());                  // each uploaded photo as the draft keeps it, by path
  const written = useRef<string | null>(null);                         // what storage holds from this page, or null
  const pending = useRef(false);                                        // a change not kept yet
  const latest = useRef(o);
  useEffect(() => { latest.current = o; });

  const save = useCallback(() => {
    pending.current = false;
    if (!opened.current) return;                                        // never before last time's draft is back
    const { read, defaults, fields, photos } = latest.current;
    const now = mergeDraft(read(), defaults, fields);
    const list = photos.flatMap(p => { const k = p.path ? kept.current.get(p.path) : undefined; return k ? [{ ...k }] : []; });
    const snapshot = JSON.stringify([now, list]);
    if (snapshot === written.current) return;                          // nothing changed (an order stays tied to it)
    if (isPristine(now, defaults) && !list.length) {                    // back to the card's own words: nothing to keep
      if (written.current !== null) { clearDraft(productId); written.current = null; setStatus(IDLE); }
      return;
    }
    const savedAt = Date.now();
    const result = saveDraft(productId, { values: now, photos: list, savedAt });
    written.current = result === 'failed' ? null : snapshot;
    setStatus(s => (result === 'failed' ? { ...s, failed: true } : { ...s, savedAt, photosUnsaved: result === 'without-photos', failed: false }));
  }, [productId]);

  useEffect(() => {                                                     // the page opens, or is shown again
    const t = setTimeout(() => {                                        // (localStorage is the browser's: not during the server's render)
      if (opened.current) {
        if (written.current !== null && !hasDraft(productId)) {         // its order was paid meanwhile: a fresh card
          kept.current = new Map(); written.current = null;
          latest.current.restore(latest.current.defaults, []);
          setStatus(IDLE);
        }
        return;
      }
      opened.current = true;
      const d = loadDraft(productId);
      if (!d) return;
      const shown = d.photos.filter(p => p.preview);                    // a photo the buyer cannot see is not sent
      const { defaults, fields } = latest.current;
      const values = mergeDraft(d.values, defaults, fields);
      kept.current = new Map(shown.map(p => [p.path, p]));               // before the form has them: they keep their upload time
      written.current = JSON.stringify([values, shown]);
      latest.current.restore(values, shown.map(p => ({ id: `draft-${p.path}`, path: p.path, previewUrl: p.preview })));
      setStatus({ ...IDLE, restoredAt: d.savedAt, savedAt: d.savedAt, photosLost: d.expired + d.photos.length - shown.length });
    }, 0);
    return () => clearTimeout(t);
  }, [productId]);

  useEffect(() => {                                                     // photos newly uploaded: when, and a small preview of each
    const next = new Map<string, DraftPhoto>(), fresh: { path: string; url: string }[] = [];
    for (const p of photos) {
      if (!p.path) continue;
      const had = kept.current.get(p.path);
      if (had) { next.set(p.path, had); continue; }
      const preview = p.previewUrl?.startsWith('data:image/') ? p.previewUrl : null;
      next.set(p.path, { path: p.path, preview, uploadedAt: Date.now() });
      if (!preview && p.previewUrl) fresh.push({ path: p.path, url: p.previewUrl });
    }
    kept.current = next;                                                // one taken out is no longer kept
    for (const f of fresh) {
      void makePreview(f.url).then(url => {
        const k = kept.current.get(f.path);
        if (url && k && !k.preview) { kept.current = new Map(kept.current).set(f.path, { ...k, preview: url }); setPreviewsMade(n => n + 1); }
      });
    }
  }, [photos]);

  useEffect(() => {                                                     // keep it, a moment after the last change
    pending.current = true;
    const t = setTimeout(save, SAVE_AFTER_MS);
    return () => clearTimeout(t);
  }, [values, photos, previewsMade, save]);

  useEffect(() => {                                                     // leaving: keep what was typed in the last moment
    const flush = () => { if (pending.current) save(); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {                                                      // also when the router hides the page
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [save]);

  const discard = useCallback(() => {
    clearDraft(productId);
    kept.current = new Map(); written.current = null; pending.current = false;
    setStatus(IDLE);
  }, [productId]);

  const ordered = useCallback((orderId: string) => {
    save();                                                             // storage holds exactly what was ordered
    if (written.current !== null) markDraftOrdered(productId, orderId);
  }, [productId, save]);

  const dirty = useMemo(() => !isPristine(mergeDraft(values, defaults, fields), defaults) || photos.length > 0,
    [values, defaults, fields, photos.length]);

  return { ...status, dirty, discard, ordered };
}
