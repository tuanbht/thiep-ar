/* A template: what plays on the printed card. templates/<id>/template.json says which kind it is
   ("film": a video on the card with painted words; "3d": scene.js builds the act) and where it stops. */
import { safeId, type Card } from "./card";

export type Kind = "film" | "3d";

export interface Template {
  name?: string;
  kind?: string;
  /** a 3D act's script, relative to the template's folder (default scene.js) */
  scene?: string;
  /** height / width of the printed card */
  aspect: number;
  /** film: the second each chapter ends; 3d: the stops, as indices */
  chapters: number[];
  /** the chapter after which the envelope rises (film); null for none; default the last */
  reveal?: number | null;
  fonts?: string;
  /** a show act's height, a model's height and its scale, in card widths */
  height?: number;
  modelHeight?: number;
  scale?: number;
  boardDefault?: string;
  [extra: string]: unknown;
}

export interface Chapter {
  /** film: the second it ends at; 3d: its index */
  end: number;
  hint: string;
  /** the envelope rises at this chapter's stop (film) */
  reveal: boolean;
}

/** A template's folder on the site: absolute, so a page at any depth (/g/<slug>) finds it. */
export const templateDir = (id: string): string => `/templates/${safeId(id)}`;

export const kindOf = (t: Template): Kind => (t.kind === "3d" ? "3d" : "film");

/** template.json as a template, or an error that says what is wrong with it. */
export function parseTemplate(raw: unknown): Template {
  if (!raw || typeof raw !== "object")
    throw new Error("template.json is not an object");
  const t = raw as Record<string, unknown>;
  if (
    !Array.isArray(t.chapters) ||
    !t.chapters.length ||
    !t.chapters.every((n) => typeof n === "number" && isFinite(n))
  )
    throw new Error("template.json has no chapters");
  const aspect =
    typeof t.aspect === "number" && t.aspect > 0 ? t.aspect : 0.625;
  return { ...(t as Template), aspect };
}

/** Each chapter's stop. Every stop says the same: a tap plays on (the player's own words, e.g. "Chạm để xem tiếp"). */
export function chaptersOf(t: Template, hint = "Tap to continue"): Chapter[] {
  const revealAt = t.reveal === null ? -1 : (t.reveal ?? t.chapters.length - 1);
  return t.chapters.map((end, i) => ({ end, hint, reveal: i === revealAt }));
}

/** The tracking file for this card: its own printed design when it has one, else the template's card. */
export const targetsUrl = (dir: string, card: Pick<Card, "design">): string =>
  card.design
    ? `${dir}/designs/${safeId(card.design)}.mind`
    : `${dir}/targets.mind`;

/** A 3D act's middle, in card widths above the card: where a finger tips it and what faces the phone. */
export function actMiddle(t: Template): number {
  const h = (t.height ?? t.modelHeight ?? 0.4) * (t.scale ?? 1);
  return Math.min(0.35, Math.max(0.1, h / 2));
}
