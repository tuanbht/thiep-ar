"use client";
/* <LivePreview>: the shop's preview box. three.js loads only in the browser, after the page; until then the box waits
   in the card's theme. */
import dynamic from "next/dynamic";
import type { Theme } from "@/lib/player/core/card";
import type { LivePreviewProps } from "./types";
import s from "./liveClasses";
import { fontVars } from "./fonts";
import { wordsFor } from "./strings";

/** what shows while the preview loads */
export function LiveWaiting({ theme }: { theme: Theme }) {
  const box = [s.box, fontVars, theme === "blush" && s.blush];
  return (
    <div className={box.filter(Boolean).join(" ")}>
      <div className={s.status}>{wordsFor(theme).loading}</div>
    </div>
  );
}

/* next/dynamic's placeholder does not see the props: one loader per theme (the preview itself loads once) */
const Views: Record<Theme, ReturnType<typeof dynamic<LivePreviewProps>>> = {
  night: dynamic(() => import("./LivePreviewView"), {
    ssr: false,
    loading: () => <LiveWaiting theme="night" />,
  }),
  blush: dynamic(() => import("./LivePreviewView"), {
    ssr: false,
    loading: () => <LiveWaiting theme="blush" />,
  }),
};

export function LivePreview(props: LivePreviewProps) {
  const View = Views[props.card.theme ?? "night"];
  return <View {...props} />;
}

export default LivePreview;
