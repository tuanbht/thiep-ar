"use client";
/* The letter's photos: several picked at once (up to LIMITS.photos in all), each shown at once from the local file and
   uploaded (POST /api/uploads, a few at a time). The form keeps each stored path; the preview keeps the local picture,
   which is let go when its photo is taken out or refused, not when the page is left (the router keeps the page and
   shows it again on Back). Under the photos: how this card uses them. */
import { useEffect, useId, useRef, useState } from "react";
import { LIMITS, type UploadResponse } from "@/lib/api/dto";
import { track } from "./events";
import { S } from "./strings";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const AT_ONCE = 3;
const TILTS = ["-rotate-2", "rotate-1", "rotate-2", "-rotate-1"];

export interface PhotoItem {
  id: string;
  /** where POST /api/uploads stored it; null while it uploads */
  path: string | null;
  /** what shows: the local picture (blob:), or a draft's small preview (data:) */
  previewUrl: string | null;
}

export interface PhotosFieldProps {
  value: PhotoItem[];
  /** a list, or how to make one from the latest (uploads end out of order) */
  onChange(next: PhotoItem[] | ((prev: PhotoItem[]) => PhotoItem[])): void;
  /** whether a photo is still uploading (the form holds "Buy" until none is) */
  onBusy?(busy: boolean): void;
  /** how many places the card has for photos */
  places: number;
  /** photos of a draft that could not come back */
  lost?: number;
}

let made = 0;
const newId = () => `photo-${Date.now().toString(36)}-${++made}`;
const revoke = (url: string | null) => {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
};

/** `job` for every item, `n` at a time */
async function inTurns<T>(
  items: T[],
  n: number,
  job: (t: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(n, queue.length) }, async () => {
      for (let t = queue.shift(); t !== undefined; t = queue.shift())
        await job(t);
    }),
  );
}

export function PhotosField({
  value,
  onChange,
  onBusy,
  places,
  lost = 0,
}: PhotosFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const pending = useRef(new Map<string, AbortController>()); // each photo not uploaded yet: taking it out stops it
  const busy = value.some((p) => !p.path);
  useEffect(() => {
    onBusy?.(busy);
  }, [busy, onBusy]);

  async function upload(item: PhotoItem, file: File) {
    const stop = pending.current.get(item.id);
    if (!stop) return; // taken out while it waited its turn
    try {
      const body = new FormData();
      body.append("photo", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        body,
        signal: stop.signal,
      });
      const json = (await res
        .json()
        .catch(() => ({}))) as Partial<UploadResponse> & { error?: string };
      if (!res.ok || !json.photoPath)
        throw new Error(json.error || S.product.photoFailed);
      track({ name: "photo_uploaded" });
      const path = json.photoPath;
      onChange((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, path } : p)),
      );
    } catch (e) {
      if (stop.signal.aborted) return; // taken out: nothing to say
      revoke(item.previewUrl);
      onChange((prev) => prev.filter((p) => p.id !== item.id));
      setErrors((es) => [
        ...es,
        `${file.name}: ${e instanceof Error ? e.message : S.product.photoFailed}`,
      ]);
    } finally {
      pending.current = new Map(
        [...pending.current].filter(([id]) => id !== item.id),
      );
    }
  }

  function pick(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = "";
    const problems: string[] = [];
    const fine = files.filter((f) => {
      if (!TYPES.includes(f.type))
        problems.push(`${f.name}: ${S.product.photoType}`);
      else if (f.size > LIMITS.photoBytes)
        problems.push(`${f.name}: ${S.product.photoTooBig}`);
      else return true;
      return false;
    });
    const room = Math.max(0, LIMITS.photos - value.length);
    if (fine.length > room)
      problems.push(S.product.photosTooMany(LIMITS.photos));
    const taken = fine.slice(0, room).map((file) => ({
      file,
      item: {
        id: newId(),
        path: null,
        previewUrl: URL.createObjectURL(file),
      } as PhotoItem,
    }));
    setErrors(problems);
    if (!taken.length) return;
    pending.current = new Map([
      ...pending.current,
      ...taken.map((t) => [t.item.id, new AbortController()] as const),
    ]);
    onChange((prev) => [...prev, ...taken.map((t) => t.item)]);
    void inTurns(taken, AT_ONCE, (t) => upload(t.item, t.file));
  }

  function remove(item: PhotoItem) {
    pending.current.get(item.id)?.abort();
    pending.current = new Map(
      [...pending.current].filter(([id]) => id !== item.id),
    );
    revoke(item.previewUrl);
    onChange((prev) => prev.filter((p) => p.id !== item.id));
  }

  return (
    <div>
      <ul className="flex flex-wrap gap-4">
        {value.map((p, i) => (
          <li
            key={p.id}
            className={`stamp relative w-24 shrink-0 bg-paper-2 ${TILTS[i % TILTS.length]}`}
          >
            <div className="relative grid aspect-square place-items-center overflow-hidden bg-paper-3/50">
              {p.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a page image
                <img
                  src={p.previewUrl}
                  alt={S.product.fields.photoN(i + 1)}
                  className={`h-full w-full object-cover transition-opacity ${p.path ? "" : "opacity-50"}`}
                />
              )}
              {!p.path && (
                <span
                  className="absolute inset-x-0 bottom-1 text-center text-[0.65rem] italic text-ink"
                  role="status"
                >
                  {S.product.fields.uploadingShort}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(p)}
              aria-label={S.product.fields.removePhotoN(i + 1)}
              className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-sm leading-none text-paper shadow transition-[transform,background-color] hover:scale-110 hover:bg-post focus-visible:outline-3 focus-visible:outline-gold"
            >
              ×
            </button>
          </li>
        ))}
        {value.length < LIMITS.photos && (
          <li>
            <input
              ref={input}
              id={id}
              type="file"
              accept={TYPES.join(",")}
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => pick(e.target.files)}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="sign grid aspect-square w-24 place-items-center rounded-sm border-2 border-dashed border-ink/40 px-2 text-center text-[0.7rem] text-ink-2 transition-colors hover:border-ink hover:bg-paper-2 hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span>
                <span
                  aria-hidden="true"
                  className="block font-hand text-3xl normal-case leading-none"
                >
                  +
                </span>
                {S.product.fields.addPhotos}
              </span>
            </button>
          </li>
        )}
      </ul>
      <p className="mt-4 text-sm italic text-ink-2">
        <span className="sign mr-2 not-italic text-[0.7rem] text-ink">
          {S.product.fields.photosCount(value.length, LIMITS.photos)}
        </span>
        {S.product.fields.photoPlaces(places)}
      </p>
      {lost > 0 && (
        <p className="mt-1 text-sm italic text-post">
          {S.product.draft.photosLost(lost)}
        </p>
      )}
      {errors.length > 0 && (
        <ul
          role="alert"
          className="mt-2 space-y-0.5 text-sm font-medium text-post"
        >
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
