/* The player's React components, as the pages use them (client components; three.js and MindAR load only in the
   browser).
     <GiftPlayer>   the gift page (/g/<slug>): the start screen, then the act on the printed card with the camera
                    (it faces the phone), or without the camera; hints, stops, pin, the letter at the end.
     <LivePreview>  the shop's preview of a card being written: the act on a virtual card in a box, played through,
                    turned with a finger; it rebuilds when the card changes (debounced). */
import type { Card } from "@/lib/player/core/card";

export type PlayerEventName =
  | "ar_start"
  | "card_found"
  | "chapter_reached"
  | "letter_open"
  | "preview_mode";
export type PlayerEvent = (
  name: PlayerEventName,
  props?: Record<string, string | number | boolean | null>,
) => void;

export interface GiftPlayerProps {
  /** the card in the player's own shape (lib/player/core/card.ts): template, words, letter, photo URL */
  card: Card;
  /** start without the camera (the "watch without the camera" choice, or a laptop) */
  initialMode?: "ar" | "preview";
  onEvent?: PlayerEvent;
}

export interface LivePreviewProps {
  card: Card;
  /** CSS class for the box (it fills it) */
  className?: string;
  /** play on by itself through the stops (default true), looping back to the start after the last */
  autoplay?: boolean;
  onEvent?: PlayerEvent;
}
