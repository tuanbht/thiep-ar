"use client";
/* The draft's line at the top of the form: that it is kept, when it was kept or brought back, and a way to start over.
   It is always there and never changes height (one line, two on a phone), so the fields below never jump while
   someone types. */
import { useEffect, useState } from "react";
import { formatWhen } from "./format";
import { S } from "./strings";
import type { DraftStatus } from "./useDraft";

const CONFIRM_MS = 4000;

export interface DraftNoteProps {
  status: DraftStatus;
  /** something is written that starting over would throw away */
  dirty: boolean;
  /** a photo is uploading: starting over now would bring it back when the upload ends */
  busy: boolean;
  onStartOver(): void;
}

function line({
  restoredAt,
  savedAt,
  failed,
  photosUnsaved,
}: DraftStatus): string {
  if (failed) return S.product.draft.failed;
  if (restoredAt !== null && (savedAt === null || savedAt <= restoredAt))
    return S.product.draft.restored(formatWhen(restoredAt));
  if (savedAt === null) return S.product.draft.idle;
  return photosUnsaved
    ? S.product.draft.savedWithoutPhotos(formatWhen(savedAt))
    : S.product.draft.saved(formatWhen(savedAt));
}

export function DraftNote({
  status,
  dirty,
  busy,
  onStartOver,
}: DraftNoteProps) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), CONFIRM_MS); // a second click within a few seconds starts over
    return () => clearTimeout(t);
  }, [asking]);
  const text = line(status);
  return (
    <div className="mb-8 flex flex-col items-start gap-1 border-b border-dashed border-ink/25 pb-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <p
        role="status"
        title={text}
        className="w-full truncate text-sm italic text-ink-2 sm:w-auto"
      >
        {text}
      </p>
      <button
        type="button"
        disabled={!dirty || busy}
        aria-hidden={!dirty || undefined}
        onClick={() => {
          if (asking) {
            setAsking(false);
            onStartOver();
          } else setAsking(true);
        }}
        className={`sign shrink-0 text-[0.7rem] underline underline-offset-4 transition-colors hover:text-post disabled:cursor-not-allowed disabled:opacity-50 ${
          asking ? "text-post" : "text-ink-2 decoration-ink/30"
        } ${dirty ? "" : "invisible"}`}
      >
        {asking ? S.product.draft.confirm : S.product.draft.startOver}
      </button>
    </div>
  );
}
