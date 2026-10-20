'use client';
/* The letter's photo: picked, shown at once (a local preview), uploaded to the server (POST /api/uploads); the form
   keeps the stored path, the preview keeps the local picture. The local picture is let go when another replaces it or
   the photo is removed, not when the page is left: the shop's router keeps the page and shows it again on Back. */
import { useEffect, useId, useRef, useState } from 'react';
import { LIMITS, type UploadResponse } from '@/lib/api/dto';
import { S } from './strings';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface PhotoState { path: string | null; previewUrl: string | null }

export interface PhotoFieldProps {
  value: PhotoState;
  onChange(v: PhotoState): void;
  onBusy?(busy: boolean): void;
  /** the draft had a photo that could not come back: ask for it again */
  lost?: boolean;
}

export function PhotoField({ value, onChange, onBusy, lost = false }: PhotoFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);

  useEffect(() => { onBusy?.(busy); }, [busy, onBusy]);   // the form holds "Buy" until the photo is in

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!TYPES.includes(file.type)) return setError(S.product.photoType);
    if (file.size > LIMITS.photoBytes) return setError(S.product.photoTooBig);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const local = URL.createObjectURL(file);
    objectUrl.current = local;
    onChange({ path: null, previewUrl: local });
    setBusy(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const res = await fetch('/api/uploads', { method: 'POST', body });
      const json = (await res.json().catch(() => ({}))) as Partial<UploadResponse> & { error?: string };
      if (!res.ok || !json.photoPath) throw new Error(json.error || S.product.photoFailed);
      onChange({ path: json.photoPath, previewUrl: local });
    } catch (e) {
      setError(e instanceof Error ? e.message : S.product.photoFailed);
      URL.revokeObjectURL(local);
      objectUrl.current = null;
      onChange({ path: null, previewUrl: null });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  function clear() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setError(null);
    onChange({ path: null, previewUrl: null });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-5">
        <div className="stamp w-32 shrink-0 bg-paper-2">
          <div className="grid aspect-square place-items-center overflow-hidden bg-paper-3/50">
            {value.previewUrl
              // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview, not a page image
              ? <img src={value.previewUrl} alt="" className={`h-full w-full object-cover transition-opacity ${busy ? 'opacity-50' : ''}`} />
              : lost
                ? <span className="px-3 text-center text-xs italic leading-snug text-post">{S.product.draft.photoLost}</span>
                : <span className="font-hand text-3xl text-ink-3" aria-hidden="true">ảnh</span>}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2">
          <input ref={input} id={id} type="file" accept={TYPES.join(',')} className="peer sr-only" onChange={e => void pick(e.target.files?.[0])} disabled={busy} />
          <label htmlFor={id} className={`sign cursor-pointer rounded-full border-2 border-ink px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-paper peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            {value.previewUrl ? S.product.fields.changePhoto : S.product.fields.choosePhoto}
          </label>
          {value.previewUrl && !busy && (
            <button type="button" onClick={clear} className="sign text-xs text-ink-2 underline decoration-ink/30 underline-offset-4 hover:text-post">{S.product.fields.removePhoto}</button>
          )}
          {busy && <p className="text-sm italic text-ink-2" role="status">{S.product.fields.uploading}</p>}
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-post">{error}</p>}
    </div>
  );
}
