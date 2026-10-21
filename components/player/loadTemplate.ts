/* A card with everything its template brings, fetched by the browser from /templates/<id>/ (public assets). */
import {
  chaptersOf,
  kindOf,
  parseTemplate,
  templateDir,
  themeOf,
  type Chapter,
  type Kind,
  type Template,
} from "@/lib/player/core/template";
import type { Card, Theme } from "@/lib/player/core/card";
import type { Slots } from "@/lib/player/engine/types";

export class LoadError extends Error {}

export interface Loaded {
  card: Card;
  tpl: Template;
  tdir: string;
  kind: Kind;
  slots: Slots | null;
  chapters: Chapter[];
  /** the card's, as the shop set it; else the template's */
  theme: Theme;
}

async function json(
  url: string,
  problem: string,
  signal?: AbortSignal,
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new LoadError(problem);
  }
  if (!res.ok) throw new LoadError(problem);
  try {
    return await res.json();
  } catch {
    throw new LoadError(problem);
  }
}

export async function loadTemplateFor(
  card: Card,
  o: {
    fallbackHint: string;
    /** the stops' hint on a blush card (default fallbackHint) */
    blushHint?: string;
    missing: string;
    signal?: AbortSignal;
  },
): Promise<Loaded> {
  const tdir = templateDir(card.template);
  let tpl: Template;
  try {
    tpl = parseTemplate(
      await json(`${tdir}/template.json`, o.missing, o.signal),
    );
  } catch (e) {
    if (
      e instanceof LoadError ||
      (e instanceof DOMException && e.name === "AbortError")
    )
      throw e;
    throw new LoadError(o.missing);
  }
  const kind = kindOf(tpl);
  let slots: Slots | null = null;
  if (kind === "film") {
    try {
      slots = (await json(`${tdir}/slots.json`, "slots", o.signal)) as Slots;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      slots = null;
    } // a film without words still plays
  }
  const theme = card.theme ?? themeOf(tpl);
  return {
    card,
    tpl,
    tdir,
    kind,
    slots,
    theme,
    chapters: chaptersOf(
      tpl,
      theme === "blush" && o.blushHint ? o.blushHint : o.fallbackHint,
    ),
  };
}
