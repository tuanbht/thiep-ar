/* A card: the words, the letter and the photos one customer sends, in the shape the player plays. The same template
   plays many cards. The shop builds it from the buyer's gift content (lib/content/toCard.ts). */

export interface CardLetter {
  to: string;
  body: string[];
  from: string;
}

export interface Card {
  template: string;
  title: string;
  seal: string;
  greeting: string;
  intro: string;
  letter: CardLetter;
  /** the first photo, or '' (for what shows one photo) */
  photo: string;
  /** every photo, in the buyer's order (the player shuffles them for the places it has) */
  photos: string[];
  /** the words each board, sign or note shows, by slot name */
  slots: Record<string, string>;
  /** Night Mail's older fields */
  signs: string[];
  mailbox: string;
  /** the card's own printed design: tracked from templates/<template>/designs/<design>.mind */
  design?: string;
}

export const CARD_DEFAULTS: Readonly<Card> = Object.freeze({
  template: "night-mail",
  title: "Night Mail",
  seal: "NM",
  greeting: "Dear you,",
  intro:
    "Point your phone at the printed card and the letter comes to life. Allow the camera when asked.",
  letter: {
    to: "Dear you,",
    body: ["This letter left at dusk and drove all night to reach you."],
    from: "Yours, always",
  },
  photo: "",
  photos: [],
  slots: {},
  signs: [
    "A letter left at dusk",
    "It took the long road",
    "Night fell. It kept driving",
    "Nearly at your door",
  ],
  mailbox: "YOU",
});

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, d: string): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : d;
const texts = (v: unknown, d: readonly string[]): string[] =>
  Array.isArray(v) ? v.map((x) => text(x, "")) : [...d];
const words = (v: unknown): Record<string, string> =>
  isObject(v)
    ? Object.fromEntries(
        Object.entries(v)
          .filter(([, t]) => typeof t === "string" || typeof t === "number")
          .map(([k, t]) => [k, String(t)]),
      )
    : {};

/** The photos, whichever way a card gave them (older cards: one "photo"); photo is always the first of photos. */
function photosOf(
  c: Record<string, unknown>,
  d: Readonly<Card>,
): Pick<Card, "photo" | "photos"> {
  const listed = Array.isArray(c.photos)
    ? c.photos.filter((p): p is string => typeof p === "string" && !!p)
    : [];
  const one = text(c.photo, d.photo);
  const photos = listed.length ? listed : one ? [one] : [];
  return { photo: photos[0] ?? "", photos };
}

/** A safe id for a path segment: letters, digits, _ and - only. */
export const safeId = (v: unknown): string =>
  String(v ?? "").replace(/[^a-z0-9_-]/gi, "");

/** Anything that claims to be a card, as a whole card: every field present and of the right type, the rest defaulted. */
export function mergeCard(raw: unknown): Card {
  const c = isObject(raw) ? raw : {};
  const l = isObject(c.letter) ? c.letter : {};
  const d = CARD_DEFAULTS;
  const design = safeId(c.design);
  return {
    template: safeId(c.template) || d.template,
    title: text(c.title, d.title),
    seal: text(c.seal, d.seal),
    greeting: text(c.greeting, d.greeting),
    intro: text(c.intro, d.intro),
    letter: {
      to: text(l.to, d.letter.to),
      body: texts(l.body, d.letter.body),
      from: text(l.from, d.letter.from),
    },
    ...photosOf(c, d),
    slots: words(c.slots),
    signs: texts(c.signs, d.signs),
    mailbox: text(c.mailbox, d.mailbox),
    ...(design && { design }),
  };
}
