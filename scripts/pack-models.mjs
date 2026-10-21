#!/usr/bin/env node
/* A 3D card's models, from free packs (scripts/models/sources.mjs) to the small files the phone downloads.
     node scripts/pack-models.mjs <template>
   reads scripts/models/recipes/<template>.json:
     { "boy":  { "from": "kaykit/Knight", "drop": ["1H_Sword", "Knight_Helmet"], "clips": ["Idle", "Walking_A", "Cheer"] },
       "sofa": { "from": "furniture/couch_pillows" } }
   and writes public/templates/<template>/models/<name>.glb: the parts in "drop" removed (weapons, a helmet), only the
   animations in "clips" kept (all of them when "clips" is left out), then pruned, deduplicated and resampled. It also
   sets template.json "models" (name -> file) and "credits" (one line per pack). Downloads are cached in .cache/. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { dedup, prune, resample } from "@gltf-transform/functions";
import { SOURCES } from "./models/sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, ".cache", "free-models");
const ID = /^[a-z0-9][a-z0-9-]*$/;
const NAME = /^[a-z][a-z0-9_]*$/i;
const FILE = /^[A-Za-z0-9_.-]+$/;

export class RecipeError extends Error {}

/** The recipe, checked: every model from a known source, names that are safe as file names. */
export function parseRecipe(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new RecipeError(
      "a recipe is an object: { name: { from, drop?, clips? } }",
    );
  return Object.entries(raw).map(([name, r]) => {
    if (!NAME.test(name))
      throw new RecipeError(
        `"${name}": a model's name is letters, digits and _`,
      );
    const [source, file, extra] = String(r?.from ?? "").split("/");
    if (!SOURCES[source] || !file || extra !== undefined || !FILE.test(file))
      throw new RecipeError(
        `"${name}": from must be <source>/<file>, source one of ${Object.keys(SOURCES).join(", ")}`,
      );
    const list = (k) => {
      if (r[k] === undefined) return null;
      if (
        !Array.isArray(r[k]) ||
        !r[k].every((x) => typeof x === "string" && x)
      )
        throw new RecipeError(`"${name}": ${k} is a list of names`);
      return r[k];
    };
    return {
      name,
      source,
      file,
      drop: list("drop") ?? [],
      clips: list("clips"),
    };
  });
}

/** Removes the dropped parts and the unused clips from a glTF document, in place; says what it could not find. */
export function trimDocument(doc, { drop, clips }) {
  const root = doc.getRoot(),
    missing = [];
  for (const want of drop) {
    const nodes = root.listNodes().filter((n) => n.getName() === want);
    if (!nodes.length) missing.push(`part ${want}`);
    for (const n of nodes) {
      const gone = [n];
      for (let i = 0; i < gone.length; i++)
        gone.push(...gone[i].listChildren());
      gone.forEach((x) => x.dispose());
    }
  }
  if (clips) {
    const have = root.listAnimations().map((a) => a.getName());
    clips
      .filter((c) => !have.includes(c))
      .forEach((c) => missing.push(`clip ${c} (it has: ${have.join(", ")})`));
    for (const a of root
      .listAnimations()
      .filter((x) => !clips.includes(x.getName()))) {
      a.listChannels().forEach((c) => c.dispose());
      a.listSamplers().forEach((s) => s.dispose());
      a.dispose(); // or its keyframes stay behind
    }
  }
  for (const a of root.listAnimations()) {
    // channels whose part was dropped
    for (const ch of a.listChannels())
      if (!ch.getTargetNode()) {
        const s = ch.getSampler();
        ch.dispose();
        if (s && !s.listParents().some((p) => p !== a)) s.dispose();
      }
  }
  return missing;
}

async function download(url, file) {
  const res = await fetch(url, {
    headers: { "User-Agent": "gift-cards pack-models" },
  });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
}

/** The source file on disk (downloaded once), with a .gltf's buffers and images beside it. */
async function fetchSource(source, file) {
  const s = SOURCES[source],
    name = `${file}${s.ext}`,
    local = path.join(CACHE, source, name);
  if (!(await fs.stat(local).catch(() => null))) {
    await download(`${s.base}${name}`, local);
    if (s.ext === ".gltf") {
      const json = JSON.parse(await fs.readFile(local, "utf8"));
      for (const uri of [...(json.buffers ?? []), ...(json.images ?? [])]
        .map((x) => x.uri)
        .filter(Boolean)) {
        if (uri.startsWith("data:")) continue;
        if (!FILE.test(uri))
          throw new Error(
            `${name} points at ${uri}: only files beside it are fetched`,
          );
        const there = path.join(CACHE, source, uri);
        if (!(await fs.stat(there).catch(() => null)))
          await download(`${s.base}${uri}`, there);
      }
    }
  }
  return local;
}

export async function packTemplate(template, { log = console.log } = {}) {
  if (!ID.test(template))
    throw new RecipeError("usage: node scripts/pack-models.mjs <template>");
  const recipeFile = path.join(
    ROOT,
    "scripts",
    "models",
    "recipes",
    `${template}.json`,
  );
  const tdir = path.join(ROOT, "public", "templates", template),
    tplFile = path.join(tdir, "template.json");
  const recipe = parseRecipe(JSON.parse(await fs.readFile(recipeFile, "utf8")));
  const tpl = JSON.parse(await fs.readFile(tplFile, "utf8"));
  const io = new NodeIO();
  const models = {},
    used = new Set();
  await fs.mkdir(path.join(tdir, "models"), { recursive: true });
  for (const m of recipe) {
    const doc = await io.read(await fetchSource(m.source, m.file));
    const missing = trimDocument(doc, m);
    if (missing.length)
      throw new RecipeError(
        `${m.name} (${m.source}/${m.file}) has no ${missing.join("; ")}`,
      );
    await doc.transform(prune(), dedup(), resample());
    const out = path.join(tdir, "models", `${m.name}.glb`),
      bytes = await io.writeBinary(doc);
    await fs.writeFile(out, bytes);
    models[m.name] = `models/${m.name}.glb`;
    used.add(m.source);
    const clips = doc
      .getRoot()
      .listAnimations()
      .map((a) => a.getName());
    log(
      `${path.relative(ROOT, out)}  ${(bytes.length / 1024).toFixed(0)} KB${clips.length ? `  clips: ${clips.join(", ")}` : ""}`,
    );
  }
  const credits = [
    ...new Map(
      [...used]
        .map((s) => SOURCES[s])
        .map((s) => [
          `${s.title}|${s.author}`,
          { model: s.title, author: s.author, license: s.license, url: s.home },
        ]),
    ).values(),
  ];
  await fs.writeFile(
    tplFile,
    `${JSON.stringify({ ...tpl, models, credits }, null, 2)}\n`,
  );
  return { models, credits };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  packTemplate(process.argv[2] ?? "").catch((e) => {
    console.error(`pack-models: ${e.message}`);
    process.exitCode = 1;
  });
}
