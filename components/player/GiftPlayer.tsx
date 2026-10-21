"use client";
/* <GiftPlayer>: the gift page's player. three.js and MindAR load only in the browser, after the page. */
import dynamic from "next/dynamic";
import type { GiftPlayerProps } from "./types";
import s from "./playerClasses";
import { fontVars } from "./fonts";
import { T } from "./strings";

const View = dynamic(() => import("./GiftPlayerView"), {
  ssr: false,
  loading: () => (
    <div className={`${s.root} ${fontVars}`}>
      <div className={s.loading}>{T.loading}</div>
    </div>
  ),
});

export function GiftPlayer(props: GiftPlayerProps) {
  return <View {...props} />;
}

export default GiftPlayer;
