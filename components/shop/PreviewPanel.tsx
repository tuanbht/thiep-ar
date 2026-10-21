"use client";
/* The live preview beside the form: the card's act on a virtual card, playing through, turned with a finger. The
   player (three.js) loads only in the browser, and only once the panel is shown; until then the box waits in the
   card's theme. */
import { LivePreview } from "@/components/player/LivePreview";
import type { Card } from "@/lib/player/core/card";
import type { PlayerEvent } from "@/components/player/types";
import { S } from "./strings";

const GROUND = {
  night:
    "bg-[radial-gradient(120%_85%_at_50%_35%,#2a3570_0%,var(--color-night-2)_40%,var(--color-night)_85%)]",
  blush:
    "bg-[radial-gradient(120%_85%_at_50%_36%,#fff5f8_0%,#ffe3ec_48%,#ffc9da_100%)]",
} as const;

export function PreviewPanel({
  card,
  onEvent,
}: {
  card: Card;
  onEvent?: PlayerEvent;
}) {
  return (
    <figure className="overflow-hidden rounded-sm border border-white/10 bg-night shadow-[var(--shadow-lift)]">
      <div
        className={`relative aspect-[4/5] w-full ${GROUND[card.theme ?? "night"]}`}
      >
        <LivePreview
          card={card}
          className="absolute inset-0"
          onEvent={onEvent}
        />
      </div>
      <figcaption className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
        <span className="sign text-xs text-gold">{S.product.preview}</span>
        <span className="text-xs italic text-paper/60">
          {S.product.previewNote}
        </span>
      </figcaption>
    </figure>
  );
}
