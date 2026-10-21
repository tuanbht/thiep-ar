"use client";
/* The gift page's player, its moments counted against the gift. The player is light until it starts: three.js and
   MindAR load only in the browser, and it waits in the card's theme meanwhile. */
import { GiftPlayer } from "@/components/player/GiftPlayer";
import type { Card } from "@/lib/player/core/card";
import type { PlayerEvent } from "@/components/player/types";
import { track } from "./events";

export function GiftClient({ card, slug }: { card: Card; slug: string }) {
  const onEvent: PlayerEvent = (name, props) =>
    track({ name, giftSlug: slug, props });
  return <GiftPlayer card={card} onEvent={onEvent} />;
}
