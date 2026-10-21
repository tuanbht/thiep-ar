"use client";
/* <GiftPlayer>: the gift page's player. three.js and MindAR load only in the browser, after the page; until then the
   page waits in the card's theme, so a love card is pink from its first frame. */
import dynamic from "next/dynamic";
import type { Theme } from "@/lib/player/core/card";
import type { GiftPlayerProps } from "./types";
import s from "./playerClasses";
import { fontVars } from "./fonts";
import { wordsFor } from "./strings";

/** what shows while the player loads */
export function PlayerWaiting({ theme }: { theme: Theme }) {
  const root = [s.root, fontVars, theme === "blush" && s.blush];
  return (
    <div className={root.filter(Boolean).join(" ")}>
      <div className={s.loading}>{wordsFor(theme).loading}</div>
    </div>
  );
}

/* next/dynamic's placeholder does not see the props: one loader per theme (the player itself loads once) */
const Views: Record<Theme, ReturnType<typeof dynamic<GiftPlayerProps>>> = {
  night: dynamic(() => import("./GiftPlayerView"), {
    ssr: false,
    loading: () => <PlayerWaiting theme="night" />,
  }),
  blush: dynamic(() => import("./GiftPlayerView"), {
    ssr: false,
    loading: () => <PlayerWaiting theme="blush" />,
  }),
};

export function GiftPlayer(props: GiftPlayerProps) {
  const View = Views[props.card.theme ?? "night"];
  return <View {...props} />;
}

export default GiftPlayer;
