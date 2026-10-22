"use client";
/* The gift page's player, its moments counted (lib/analytics/ga.ts: never the gift's link, only its card). The player
   is light until it starts: three.js and MindAR load only in the browser, and it waits in the card's theme meanwhile. */
import { useEffect } from "react";
import { GiftPlayer } from "@/components/player/GiftPlayer";
import type { Card } from "@/lib/player/core/card";
import type { PlayerEvent } from "@/components/player/types";
import { track } from "./events";

export function GiftClient({
  card,
  productId,
}: {
  card: Card;
  productId: string;
}) {
  useEffect(() => {
    track({ name: "gift_open", productId });
  }, [productId]);
  const onEvent: PlayerEvent = (name, props) =>
    track({ name, productId, props });
  return <GiftPlayer card={card} onEvent={onEvent} />;
}
