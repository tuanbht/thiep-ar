#!/usr/bin/env node
/* Plays a 3D card on the dev player in its own headless Chromium and keeps pictures of it: one at every stop and a few
   on the way, so a card can be checked without a phone (several of these can run at once).
     node scripts/shoot-card.mjs <template> [--base http://localhost:3001] [--every 1.5] [--photo /thumbs/flower-letter.jpg]
       [--size 430x860]
   writes .cache/shots/<template>/stop-<i>.png and play-<i>-g<story seconds>.png (a love story card says where its story
   is; headless rendering is slow, so that is not the wall clock), and says what the page logged as errors.
   Needs `pnpm dev` running (the dev player is /dev/player?t=<template>&mode=preview). */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function args(argv) {
  const o = { base: 'http://localhost:3001', every: 1.5, photo: '', size: '430x860' };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) o[a.slice(2)] = argv[++i]; else pos.push(a);
  }
  return { template: pos[0] ?? '', ...o, every: Number(o.every) || 0 };
}

export async function shootCard(template, o = {}, log = console.log) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(template)) throw new Error('usage: node scripts/shoot-card.mjs <template> [--base url] [--every s] [--photo url]');
  const [w, h] = String(o.size ?? '430x860').split('x').map(Number);
  const out = path.join(ROOT, '.cache', 'shots', template);
  await fs.rm(out, { recursive: true, force: true }); await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => {                                         // a card without its shop picture yet is not an error here
      if (m.type() === 'error' && !/_next\/image|\/thumbs\//.test(`${m.text()} ${m.location()?.url ?? ''}`)) errors.push(`${m.text()} ${m.location()?.url ?? ''}`.trim());
    });
    const url = new URL('/dev/player', o.base ?? 'http://localhost:3001');
    url.search = new URLSearchParams({ t: template, mode: 'preview', ...(o.photo ? { photo: o.photo } : {}) }).toString();
    await page.goto(url.href);
    const state = () => page.evaluate(() => window.__state || '');
    const until = async (re, ms) => { const end = Date.now() + ms; while (Date.now() < end) { const s = await state(); if (re.test(s)) return s; await page.waitForTimeout(100); } return state(); };
    const first = await until(/^playing:0$|^error|^fallback/, 60_000);
    if (!/^playing:0$/.test(first)) throw new Error(`the card did not start (state "${first}")`);
    const shots = [];
    for (let i = 0; ; i++) {
      const t0 = Date.now();
      for (let k = 1; o.every && Date.now() - t0 < 60_000; k++) {             // pictures on the way to the stop
        const at = t0 + k * o.every * 1000;
        while (Date.now() < at && (await state()) === `playing:${i}`) await page.waitForTimeout(50);
        if ((await state()) !== `playing:${i}`) break;
        const g = await page.evaluate(() => window.__storyClock);       // headless renders slowly: name it by the story's own clock
        const f = path.join(out, `play-${i}-${typeof g === 'number' ? `g${g.toFixed(1)}` : (k * o.every).toFixed(1)}.png`); await page.screenshot({ path: f }); shots.push(f);
      }
      const s = await until(new RegExp(`^paused:${i}$|^reading$|^error`), 60_000);
      if (s !== `paused:${i}`) throw new Error(`chapter ${i} did not reach its stop (state "${s}")`);
      await page.waitForTimeout(700);
      const f = path.join(out, `stop-${i}.png`); await page.screenshot({ path: f }); shots.push(f);
      log(`stop ${i} after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      await page.getByRole('button', { name: /Chạm để xem tiếp/ }).click();
      const next = await until(new RegExp(`^playing:${i + 1}$|^reading$`), 10_000);
      if (next === 'reading') { const r = path.join(out, 'letter.png'); await page.screenshot({ path: r }); shots.push(r); break; }
      if (next !== `playing:${i + 1}`) throw new Error(`a tap at stop ${i} did not play on (state "${next}")`);
    }
    log(`${shots.length} pictures in ${path.relative(ROOT, out)}`);
    if (errors.length) log(`page errors:\n  ${[...new Set(errors)].join('\n  ')}`);
    return { shots, errors };
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = args(process.argv.slice(2));
  shootCard(a.template, a).catch(e => { console.error(`shoot-card: ${e.message}`); process.exitCode = 1; });
}
