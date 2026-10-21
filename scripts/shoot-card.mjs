#!/usr/bin/env node
/* Plays a 3D card on the dev player in its own headless Chromium and keeps pictures of it: one at every stop and a few
   on the way, so a card can be checked without a phone (several of these can run at once).
     node scripts/shoot-card.mjs <template> [--base http://localhost:3001] [--every 1.5] [--photo /thumbs/a.jpg,/thumbs/b.jpg] [--patience 60] [--hold 0]
   --photo gives the card its photos (one, or several separated by commas); --patience is how many seconds a chapter may
   take to reach its stop on a busy machine (60 by default); --hold keeps taking pictures at each stop for that many
   seconds, one every 1.5 s (stop-<i>-h<s>.png), to see what a waiting card does (photos taking turns).
       [--size 430x860]
   writes .cache/shots/<template>/stop-<i>.png and play-<i>-g<story seconds>.png (a love story card says where its story
   is; headless rendering is slow, so that is not the wall clock), and says what the page logged as errors.
   Needs `pnpm dev` running (the dev player is /dev/player?t=<template>&mode=preview). */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function args(argv) {
  const o = {
    base: "http://localhost:3001",
    every: 1.5,
    photo: "",
    size: "430x860",
    patience: 60,
    hold: 0,
  };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) o[a.slice(2)] = argv[++i];
    else pos.push(a);
  }
  return {
    template: pos[0] ?? "",
    ...o,
    every: Number(o.every) || 0,
    patience: Number(o.patience) || 60,
    hold: Number(o.hold) || 0,
  };
}

export async function shootCard(template, o = {}, log = console.log) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(template))
    throw new Error(
      "usage: node scripts/shoot-card.mjs <template> [--base url] [--every s] [--photo url,url…] [--patience s]",
    );
  const form = path.join(ROOT, "public", "templates", template, "form.json");
  if (!(await fs.stat(form).catch(() => null)))
    throw new Error(
      `public/templates/${template}/form.json is missing: the dev player builds its card from it`,
    );
  const [w, h] = String(o.size ?? "430x860")
    .split("x")
    .map(Number);
  const out = path.join(ROOT, ".cache", "shots", template);
  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({
    args: [
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
    ],
  });
  const errors = [];
  try {
    const page = await browser.newPage({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
    });
    page.setDefaultTimeout(120_000); // a busy machine (several shoots at once) renders a frame slowly
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      // a card without its shop picture yet is not an error here
      if (
        m.type() === "error" &&
        !/_next\/image|\/thumbs\//.test(
          `${m.text()} ${m.location()?.url ?? ""}`,
        )
      )
        errors.push(`${m.text()} ${m.location()?.url ?? ""}`.trim());
    });
    const url = new URL("/dev/player", o.base ?? "http://localhost:3001");
    const search = new URLSearchParams({ t: template, mode: "preview" });
    for (const p of String(o.photo ?? "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean))
      search.append("photo", p);
    url.search = search.toString();
    const wait = Math.max(10, Number(o.patience) || 60) * 1000;
    await page.goto(url.href);
    const state = () => page.evaluate(() => window.__state || "");
    const until = async (re, ms) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const s = await state();
        if (re.test(s)) return s;
        await page.waitForTimeout(100);
      }
      return state();
    };
    const first = await until(/^(playing|paused):0$|^error|^fallback/, 60_000); // a film may stop almost at once (its first stop at 0.01 s)
    if (!/^(playing|paused):0$/.test(first))
      throw new Error(
        `the card did not start (state "${first}")${errors.length ? `; the page said: ${[...new Set(errors)].slice(0, 3).join(" | ")}` : ""}`,
      );
    const shots = [];
    for (let i = 0; ; i++) {
      const t0 = Date.now();
      for (let k = 1; o.every && Date.now() - t0 < wait; k++) {
        // pictures on the way to the stop
        const at = t0 + k * o.every * 1000;
        while (Date.now() < at && (await state()) === `playing:${i}`)
          await page.waitForTimeout(50);
        if ((await state()) !== `playing:${i}`) break;
        const g = await page.evaluate(() => window.__storyClock); // headless renders slowly: name it by the story's own clock
        const f = path.join(
          out,
          `play-${i}-${typeof g === "number" ? `g${g.toFixed(1)}` : (k * o.every).toFixed(1)}.png`,
        );
        await page.screenshot({ path: f });
        shots.push(f);
      }
      const s = await until(new RegExp(`^paused:${i}$|^reading$|^error`), wait);
      if (s !== `paused:${i}`)
        throw new Error(`chapter ${i} did not reach its stop (state "${s}")`);
      await page.waitForTimeout(700);
      const f = path.join(out, `stop-${i}.png`);
      await page.screenshot({ path: f });
      shots.push(f);
      for (let h = 1.5; h <= (Number(o.hold) || 0) + 1e-6; h += 1.5) {
        // the card waiting at its stop
        await page.waitForTimeout(1500);
        const fh = path.join(out, `stop-${i}-h${h.toFixed(1)}.png`);
        await page.screenshot({ path: fh });
        shots.push(fh);
      }
      log(`stop ${i} after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      await page
        .getByRole("button", { name: /Chạm (nhẹ )?để xem tiếp/ })
        .click(); // a love card says it softly
      const next = await until(
        new RegExp(`^playing:${i + 1}$|^reading$`),
        10_000,
      );
      if (next === "reading") {
        const r = path.join(out, "letter.png");
        await page.screenshot({ path: r });
        shots.push(r);
        break;
      }
      if (next !== `playing:${i + 1}`)
        throw new Error(`a tap at stop ${i} did not play on (state "${next}")`);
    }
    log(`${shots.length} pictures in ${path.relative(ROOT, out)}`);
    if (errors.length)
      log(`page errors:\n  ${[...new Set(errors)].join("\n  ")}`);
    return { shots, errors };
  } finally {
    await browser.close();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const a = args(process.argv.slice(2));
  shootCard(a.template, a).catch((e) => {
    console.error(`shoot-card: ${e.message}`);
    process.exitCode = 1;
  });
}
