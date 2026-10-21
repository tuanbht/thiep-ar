"use client";
/* The gift page's player (three.js and MindAR load only in the browser), its moments counted against the gift. */
import dynamic from "next/dynamic";
import type { Card } from "@/lib/player/core/card";
import type { PlayerEvent } from "@/components/player/types";
import { track } from "./events";
import { S } from "./strings";

const GiftPlayer = dynamic(
  () => import("@/components/player/GiftPlayer").then((m) => m.GiftPlayer),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 grid place-items-center bg-night">
        <p className="sign animate-pulse text-xs text-gold motion-reduce:animate-none">
          {S.gift.loading}
        </p>
      </div>
    ),
  },
);

export function GiftClient({ card, slug }: { card: Card; slug: string }) {
  const onEvent: PlayerEvent = (name, props) =>
    track({ name, giftSlug: slug, props });
  return <GiftPlayer card={card} onEvent={onEvent} />;
}
