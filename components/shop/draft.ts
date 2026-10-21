/* The card being written, kept in this browser while it is written: a reload, a closed tab or a trip to the checkout and
   back finds it again. One draft per product (draftStore.ts): the form's values and the uploaded photos (each its stored
   path and a small preview). A photo uploaded more than PHOTO_FRESH_MS ago is left out, since the nightly cleanup
   deletes photos no order took; a draft older than a month is forgotten, other cards' too. A draft kept before photo
   lists (version 1, one photo) still opens. Storage that is full keeps the draft without its photos' previews (they
   are added again after a reload); storage switched off (a private window) only means no draft: nothing here throws. */
import { z } from "zod";
import { LIMITS, PHOTO_PATH } from "@/lib/api/dto";
import type { FormField } from "@/lib/catalog/form";
import { fieldKey, type CustomizeValues } from "./customize";
import { clearDraft, DRAFT_PREFIX, draftKey, draftStorage } from "./draftStore";

export { clearDraft };

export interface DraftPhoto {
  /** where POST /api/uploads stored it */
  path: string;
  /** a small data: URL to show it again after a reload (null when there was no room for it) */
  preview: string | null;
  uploadedAt: number;
}

export interface Draft {
  values: CustomizeValues;
  /** in the buyer's order */
  photos: DraftPhoto[];
  savedAt: number;
}

export const PHOTO_FRESH_MS = 18 * 3600_000;
const MAX_AGE_MS = 30 * 24 * 3600_000;
const VERSION = 2;
/** far beyond any field's limit (the form says when one is too long): only nonsense is cut */
const TEXT_MAX = 5000;

const text = z.string().max(TEXT_MAX);
const values = z.object({
  title: text,
  intro: text,
  to: text,
  from: text,
  body: z.array(z.object({ text })).max(50),
  words: z.record(z.string(), text),
});
const photo = z.object({
  path: z.string().regex(PHOTO_PATH),
  preview: z.string().startsWith("data:image/").max(600_000).nullable(),
  uploadedAt: z.number(),
});
/** a photo that is not one of our uploads is dropped: the words and the other photos still count */
const ours = (list: unknown[]): DraftPhoto[] =>
  list.flatMap((p) => {
    const r = photo.safeParse(p);
    return r.success ? [r.data] : [];
  });
const stored = z.union([
  z.object({
    v: z.literal(VERSION),
    savedAt: z.number(),
    values,
    photos: z.array(z.unknown()).max(LIMITS.photos).transform(ours),
  }),
  z
    .object({
      v: z.literal(1),
      savedAt: z.number(),
      values,
      photo: z.unknown(),
    })
    .transform(({ photo: one, ...d }) => ({
      ...d,
      photos: one ? ours([one]) : [],
    })),
]);

/** The draft for this card, or null. expired: how many of its photos were too old to use now (they are left out). */
export function loadDraft(
  productId: string,
  now = Date.now(),
): (Draft & { expired: number }) | null {
  const s = draftStorage();
  sweepDrafts(now, productId);
  try {
    const raw = s?.getItem(draftKey(productId));
    if (!raw) return null;
    const r = stored.safeParse(JSON.parse(raw));
    if (!r.success || now - r.data.savedAt > MAX_AGE_MS) {
      clearDraft(productId);
      return null;
    }
    const { values, photos, savedAt } = r.data;
    const fresh = photos.filter((p) => now - p.uploadedAt < PHOTO_FRESH_MS);
    return {
      values,
      photos: fresh,
      savedAt,
      expired: photos.length - fresh.length,
    };
  } catch {
    if (s) clearDraft(productId); // unreadable: start again rather than fail every load
    return null;
  }
}

/** How keeping a draft went: whole; without its photos' previews (the browser is short of room, so after a reload the
    photos must be added again); or not at all. */
export type SaveResult = "saved" | "without-photos" | "failed";

/** Keeps the draft (no longer tied to an order it was made into: it may differ now). Short of room, it first lets go
    of other cards' drafts that are a month old, then leaves the photos' previews out. */
export function saveDraft(productId: string, draft: Draft): SaveResult {
  const s = draftStorage();
  if (!s) return "failed";
  const write = (d: Draft) =>
    s.setItem(
      draftKey(productId),
      JSON.stringify({
        v: VERSION,
        savedAt: d.savedAt,
        values: d.values,
        photos: d.photos,
      }),
    );
  try {
    write(draft);
    return "saved";
  } catch {
    /* full: make room and try again */
  }
  if (sweepDrafts(draft.savedAt, productId)) {
    try {
      write(draft);
      return "saved";
    } catch {
      /* still full */
    }
  }
  if (!draft.photos.some((p) => p.preview)) return "failed";
  try {
    write({
      ...draft,
      photos: draft.photos.map((p) => ({ ...p, preview: null })),
    });
    return "without-photos";
  } catch {
    return "failed";
  }
}

/** Lets go of other cards' drafts that are a month old or cannot be read; true when any went. */
function sweepDrafts(now: number, except: string): boolean {
  const s = draftStorage();
  let swept = false;
  try {
    if (!s) return false;
    const keys = Array.from({ length: s.length }, (_, i) => s.key(i)).filter(
      (k): k is string =>
        !!k && k.startsWith(DRAFT_PREFIX) && k !== draftKey(except),
    );
    for (const k of keys)
      if (isStale(s.getItem(k), now)) {
        s.removeItem(k);
        swept = true;
      }
  } catch {
    /* storage switched off: nothing to let go */
  }
  return swept;
}

function isStale(raw: string | null, now: number): boolean {
  try {
    const savedAt = (JSON.parse(raw ?? "null") as { savedAt?: unknown } | null)
      ?.savedAt;
    return typeof savedAt !== "number" || now - savedAt > MAX_AGE_MS;
  } catch {
    return true;
  }
}

/** A saved draft (or the form's values as they stand, some perhaps missing) fitted to the card's form as it is now: only
    its fields, as many paragraphs as a letter takes, one at least; anything missing is the card's own default. Text
    too long for its field is kept as written: the form says so, and the buyer decides what to cut. */
export function mergeDraft(
  saved: Partial<CustomizeValues>,
  defaults: CustomizeValues,
  fields: FormField[],
): CustomizeValues {
  const str = (v: unknown, fallback: string) =>
    (typeof v === "string" ? v : fallback).slice(0, TEXT_MAX);
  const body = (Array.isArray(saved.body) ? saved.body : defaults.body)
    .slice(0, LIMITS.paragraphs)
    .map((p) => ({ text: str(p?.text, "") }));
  return {
    title: str(saved.title, defaults.title),
    intro: str(saved.intro, defaults.intro),
    to: str(saved.to, defaults.to),
    body: body.length ? body : [{ text: "" }],
    from: str(saved.from, defaults.from),
    words: Object.fromEntries(
      fields.map((f) => [
        fieldKey(f),
        str(saved.words?.[fieldKey(f)], defaults.words[fieldKey(f)] ?? ""),
      ]),
    ),
  };
}

/** Whether these values are still the card's own, untouched: nothing to keep. */
export function isPristine(
  values: CustomizeValues,
  defaults: CustomizeValues,
): boolean {
  const same = (a: unknown, b: unknown) => (a ?? "") === (b ?? "");
  return (
    same(values.title, defaults.title) &&
    same(values.intro, defaults.intro) &&
    same(values.to, defaults.to) &&
    same(values.from, defaults.from) &&
    values.body.length === defaults.body.length &&
    values.body.every((p, i) => same(p?.text, defaults.body[i]?.text)) &&
    Object.keys(defaults.words).every((k) =>
      same(values.words?.[k], defaults.words[k]),
    )
  );
}

/** A small JPEG of a picture (a blob: URL), to show the photo again after a reload (about 15 kB: ten fit in a draft
    easily); null where there is no canvas. */
export async function makePreview(
  src: string,
  max = 240,
): Promise<string | null> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const c = canvas.getContext("2d");
    if (!c) return null;
    c.fillStyle = "#fff"; // a JPEG has no transparency: a clear PNG goes on white, not black
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}
