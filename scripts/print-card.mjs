#!/usr/bin/env node
/* A card's print: print-designs/<template>.html (1280 x 800, fonts from node_modules/@fontsource) drawn in Chromium, then
     print-designs/out/<template>.png         the print at 2x (2560 x 1600), for the printer (not committed: rebuild it)
     public/thumbs/<template>.jpg              the shop's picture (960 x 600)
     public/templates/<template>/targets.mind  what the phone's camera looks for (MindAR, from the 1280 x 800 render)
   usage: node scripts/print-card.mjs <template> [--no-compile]
   The page is served at http://print.local/ (the repo's root), so a design links /node_modules/@fontsource/... and
   /public/.... It must hold still: the render waits until two screenshots match. Busy is good: edges, text and shapes
   are what the tracker holds on to; the run prints the target's feature count next to Flower Letter's. Compiling takes
   minutes and a lot of CPU, so runs from parallel agents queue on a lock (.cache/compile.lock). */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decode } from '@msgpack/msgpack';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'http://print.local';
const LOCK = path.join(ROOT, '.cache', 'compile.lock');
const STALE_MS = 40 * 60_000;
const STILL_PIXELS = 200;                                              // big text can rasterise a few pixels differently each time
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

/** MindAR's own compiler, in the page: the design's 1280 x 800 render in, the .mind file out (base64). */
const COMPILE_PAGE = `<!doctype html><html><head><meta charset="utf-8"></head><body><img id="t">
<script type="module" src="/node_modules/mind-ar/dist/mindar-image.prod.js"></script>
<script type="module">
window.compileDone = null;
(async () => {
  const img = document.getElementById('t');
  img.src = '/__design.png';
  await new Promise((ok, no) => { img.onload = ok; img.onerror = () => no(new Error('the render did not load')); });
  const compiler = new MINDAR.IMAGE.Compiler();
  await compiler.compileImageTargets([img], p => { window.progress = p; });
  const bytes = new Uint8Array(await compiler.exportData()); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  window.compileDone = btoa(s);
})().catch(e => { window.compileDone = 'ERR ' + e.message; });
</script></body></html>`;

/** How many pixels two same-sized screenshots differ in. */
export async function differingPixels(a, b) {
  const [x, y] = await Promise.all([a, b].map(p => sharp(p).removeAlpha().raw().toBuffer({ resolveWithObject: true })));   // both RGB
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return Infinity;
  const ch = x.info.channels; let n = 0;
  for (let i = 0; i < x.data.length; i += ch) if (x.data[i] !== y.data[i] || x.data[i + 1] !== y.data[i + 1] || x.data[i + 2] !== y.data[i + 2]) n++;
  return n;
}

/** "how many points the tracker has": matching points (finding the card) and tracking points (holding on to it) */
export function features(buf) {
  const d = decode(buf).dataList[0];
  const match = d.matchingData.reduce((n, s) => n + s.maximaPoints.length + s.minimaPoints.length, 0);
  return { match, tracking: d.trackingData.map(s => (s.points || []).length) };
}

/** Runs `job` while holding the compile lock; waits for another run's, and takes over one left behind. */
export async function withLock(file, job, { wait = 3000, stale = STALE_MS, log = () => {} } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  for (let said = false; ;) {
    try { const h = await fs.open(file, 'wx'); await h.writeFile(`${process.pid} ${new Date().toISOString()}\n`); await h.close(); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const st = await fs.stat(file).catch(() => null);
      if (st && Date.now() - st.mtimeMs > stale) { await fs.rm(file, { force: true }); continue; }
      if (!said) { log('another card is compiling: waiting for it'); said = true; }
      await new Promise(r => setTimeout(r, wait));
    }
  }
  try { return await job(); } finally { await fs.rm(file, { force: true }); }
}

async function serve(route) {
  const url = new URL(route.request().url());
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep)) return route.fulfill({ status: 403, body: 'outside the repo' });
  try {
    const body = await fs.readFile(file);
    return route.fulfill({ status: 200, body, contentType: TYPES[path.extname(file)] ?? 'application/octet-stream' });
  } catch { return route.fulfill({ status: 404, body: `${rel} not found` }); }
}

export async function printCard(template, { compile = true, log = console.log } = {}) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(template)) throw new Error('usage: node scripts/print-card.mjs <template> [--no-compile]');
  const design = path.join(ROOT, 'print-designs', `${template}.html`);
  const tdir = path.join(ROOT, 'public', 'templates', template);
  if (!(await fs.stat(design).catch(() => null))) throw new Error(`print-designs/${template}.html is missing: draw the card first (1280 x 800)`);
  if (!(await fs.stat(tdir).catch(() => null))) throw new Error(`public/templates/${template} does not exist`);
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
    const errors = [];
    let png1x = null;
    await ctx.route(`${ORIGIN}/**`, route => (new URL(route.request().url()).pathname === '/__design.png'
      ? route.fulfill({ status: 200, body: png1x, contentType: 'image/png' })
      : new URL(route.request().url()).pathname === '/__compile.html'
        ? route.fulfill({ status: 200, body: COMPILE_PAGE, contentType: 'text/html' })
        : serve(route)));
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${ORIGIN}/print-designs/${template}.html`);
    await page.evaluate(() => document.fonts.ready.then(() => window.__ready));
    let shot = await page.screenshot(), still = false;
    for (let i = 0; i < 25 && !still; i++) {                          // a busy machine may still be drawing: wait until it holds still
      await page.waitForTimeout(400);
      const again = await page.screenshot();
      still = again.equals(shot) || (await differingPixels(shot, again)) < STILL_PIXELS; shot = again;
    }
    if (!still) throw new Error('the design never stopped changing: a print cannot move');
    if (errors.length) throw new Error(`the design has errors: ${errors.slice(0, 3).join(' | ')}`);
    const meta = await sharp(shot).metadata();
    if (meta.width !== 2560 || meta.height !== 1600) throw new Error(`the design rendered ${meta.width} x ${meta.height}, not 2560 x 1600: keep the page 1280 x 800`);
    await fs.mkdir(path.join(ROOT, 'print-designs', 'out'), { recursive: true });
    const print = path.join(ROOT, 'print-designs', 'out', `${template}.png`), thumb = path.join(ROOT, 'public', 'thumbs', `${template}.jpg`);
    await fs.writeFile(print, shot);
    await sharp(shot).resize(960, 600).jpeg({ quality: 86, mozjpeg: true }).toFile(thumb);
    log(`${path.relative(ROOT, print)} (2560 x 1600) and ${path.relative(ROOT, thumb)} written`);
    if (!compile) return null;
    png1x = await sharp(shot).resize(1280, 800).png().toBuffer();
    const t0 = Date.now();
    const b64 = await withLock(LOCK, async () => {
      await page.goto(`${ORIGIN}/__compile.html`);
      await page.waitForFunction(() => window.compileDone, null, { timeout: 30 * 60_000, polling: 2000 });
      return page.evaluate(() => window.compileDone);
    }, { log });
    if (String(b64).startsWith('ERR')) throw new Error(`MindAR could not compile it: ${b64}`);
    const buf = Buffer.from(b64, 'base64'), mind = path.join(tdir, 'targets.mind');
    await fs.writeFile(mind, buf);
    const mine = features(buf), ref = features(await fs.readFile(path.join(ROOT, 'public', 'templates', 'flower-letter', 'targets.mind')));
    log(`${path.relative(ROOT, mind)} written in ${Math.round((Date.now() - t0) / 1000)} s: ${mine.match} matching points, tracking ${mine.tracking.join('/')}` +
      `  (Flower Letter: ${ref.match}, ${ref.tracking.join('/')})`);
    return mine;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  printCard(args.find(a => !a.startsWith('--')) ?? '', { compile: !args.includes('--no-compile') })
    .catch(e => { console.error(`print-card: ${e.message}`); process.exitCode = 1; });
}
