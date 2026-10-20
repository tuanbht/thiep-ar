'use client';
/* The customise form's draft (draft.ts): brought back once when the page opens, kept a moment after every change, and
   thrown away on "start over". The shop's router keeps a page it leaves (hidden, its state intact) and shows it again on
   Back, so: the draft is looked for only once per page; what was typed in the last moment is kept when the page is
   hidden or the tab closes; and a page shown again after its draft was let go (the order made from it was paid) starts
   afresh. The photo's small preview is made from the picked file, so a reload can show it again. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormField } from '@/lib/catalog/form';
import type { CustomizeValues } from './customize';
import { clearDraft, isPristine, loadDraft, makePreview, mergeDraft, saveDraft, type DraftPhoto } from './draft';
import { hasDraft, markDraftOrdered } from './draftStore';
import type { PhotoState } from './PhotoField';

const SAVE_AFTER_MS = 400;
const NO_PHOTO: PhotoState = { path: null, previewUrl: null };

export interface DraftStatus {
  /** when the draft brought back on opening was written, or null */
  restoredAt: number | null;
  /** when it was last kept, or null */
  savedAt: number | null;
  /** the draft had a photo that cannot come back (too old, or kept without its preview): it must be chosen again */
  photoLost: boolean;
  /** the browser would not keep it (storage full or switched off) */
  failed: boolean;
}

const IDLE: DraftStatus = { restoredAt: null, savedAt: null, photoLost: false, failed: false };

export interface UseDraftOptions {
  productId: string;
  fields: FormField[];
  defaults: CustomizeValues;
  /** the form's values as watched: each change is kept a moment later */
  values: CustomizeValues;
  /** the form's values right now (what is kept) */
  read(): CustomizeValues;
  photo: PhotoState;
  /** put values and a photo into the form */
  restore(values: CustomizeValues, photo: PhotoState): void;
}

export interface Draft extends DraftStatus {
  /** something is written that starting over would throw away */
  dirty: boolean;
  discard(): void;
  /** the card was just ordered as it stands: paying that order lets the draft go */
  ordered(orderId: string): void;
}

export function useDraft(o: UseDraftOptions): Draft {
  const { productId, values, photo, defaults, fields } = o;
  const [status, setStatus] = useState<DraftStatus>(IDLE);
  const [previewMade, setPreviewMade] = useState(0);
  const opened = useRef(false);                                         // last time's draft was looked for
  const kept = useRef<DraftPhoto | null>(null);                        // the photo as the draft keeps it
  const written = useRef<string | null>(null);                         // what storage holds from this page, or null
  const pending = useRef(false);                                        // a change not kept yet
  const latest = useRef(o);
  useEffect(() => { latest.current = o; });

  const save = useCallback(() => {
    pending.current = false;
    if (!opened.current) return;                                        // never before last time's draft is back
    const { read, defaults, fields } = latest.current;
    const now = mergeDraft(read(), defaults, fields);
    const photo = kept.current && { ...kept.current };
    const snapshot = JSON.stringify([now, photo]);
    if (snapshot === written.current) return;                          // nothing changed (an order stays tied to it)
    if (isPristine(now, defaults) && !photo) {                          // back to the card's own words: nothing to keep
      if (written.current !== null) { clearDraft(productId); written.current = null; setStatus(IDLE); }
      return;
    }
    const savedAt = Date.now();
    const ok = saveDraft(productId, { values: now, photo, savedAt });
    written.current = ok ? snapshot : null;
    setStatus(s => (ok ? { ...s, savedAt, failed: false } : { ...s, failed: true }));
  }, [productId]);

  useEffect(() => {                                                     // the page opens, or is shown again
    const t = setTimeout(() => {                                        // (localStorage is the browser's: not during the server's render)
      if (opened.current) {
        if (written.current !== null && !hasDraft(productId)) {         // its order was paid meanwhile: a fresh card
          kept.current = null; written.current = null;
          latest.current.restore(latest.current.defaults, NO_PHOTO);
          setStatus(IDLE);
        }
        return;
      }
      opened.current = true;
      const d = loadDraft(productId);
      if (!d) return;
      const photo = d.photo?.preview ? d.photo : null;                  // a photo the buyer cannot see is not sent
      const { defaults, fields } = latest.current;
      const values = mergeDraft(d.values, defaults, fields);
      kept.current = photo;
      written.current = JSON.stringify([values, photo]);
      latest.current.restore(values, photo ? { path: photo.path, previewUrl: photo.preview } : NO_PHOTO);
      setStatus({ restoredAt: d.savedAt, savedAt: d.savedAt, photoLost: d.photoExpired || (!!d.photo && !photo), failed: false });
    }, 0);
    return () => clearTimeout(t);
  }, [productId]);

  useEffect(() => {                                                     // a photo newly uploaded: when, and a small preview of it
    if (!photo.path) { kept.current = null; return; }
    if (kept.current?.path === photo.path) return;
    const now: DraftPhoto = { path: photo.path, preview: null, uploadedAt: Date.now() };
    kept.current = now;
    if (photo.previewUrl) {
      void makePreview(photo.previewUrl).then(url => {
        if (kept.current === now && url) { kept.current = { ...now, preview: url }; setPreviewMade(n => n + 1); }
      });
    }
  }, [photo.path, photo.previewUrl]);

  useEffect(() => {                                                     // keep it, a moment after the last change
    pending.current = true;
    const t = setTimeout(save, SAVE_AFTER_MS);
    return () => clearTimeout(t);
  }, [values, photo, previewMade, save]);

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
    kept.current = null; written.current = null; pending.current = false;
    setStatus(IDLE);
  }, [productId]);

  const ordered = useCallback((orderId: string) => {
    save();                                                             // storage holds exactly what was ordered
    if (written.current !== null) markDraftOrdered(productId, orderId);
  }, [productId, save]);

  const dirty = useMemo(() => !isPristine(mergeDraft(values, defaults, fields), defaults) || !!photo.previewUrl,
    [values, defaults, fields, photo.previewUrl]);

  return { ...status, dirty, discard, ordered };
}
