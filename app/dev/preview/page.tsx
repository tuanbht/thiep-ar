"use client";
/* /dev/preview?t=<template>&w=480&h=360 : the shop's preview box on its own; the field changes the board's words. */
import { useState } from "react";
import { LivePreview } from "@/components/player";
import { useDevCard } from "../useDevCard";

export default function DevPreview() {
  const { card, params } = useDevCard();
  const [words, setWords] = useState<string | null>(null);
  if (!card || !params) return null;
  const shown =
    words === null ? card : { ...card, slots: { ...card.slots, board: words } };
  const w = Number(params.get("w")) || 480,
    h = Number(params.get("h")) || 360;
  return (
    <main
      style={{
        padding: 24,
        display: "grid",
        gap: 12,
        background: "#f4ecd8",
        minHeight: "100vh",
        alignContent: "start",
      }}
    >
      <div
        style={{ width: w, height: h, borderRadius: 12, overflow: "hidden" }}
      >
        <LivePreview card={shown} autoplay={params.get("autoplay") !== "0"} />
      </div>
      <input
        id="words"
        aria-label="Board words"
        defaultValue={card.slots.board ?? ""}
        onChange={(e) => setWords(e.target.value)}
        style={{ width: w, padding: 8 }}
      />
    </main>
  );
}
