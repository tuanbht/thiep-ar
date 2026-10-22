import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/* Every file a real template names is there. Cards reach into shared folders (../_acts, ../_models, ../_sounds), so a
   misspelt path would only show on a phone, as an act that never loads or a sound that never plays. */
const TEMPLATES = path.join(process.cwd(), "public/templates");

const strings = (v: unknown): string[] =>
  typeof v === "string"
    ? [v]
    : Array.isArray(v)
      ? v.filter((x): x is string => typeof x === "string")
      : v && typeof v === "object"
        ? Object.values(v).flatMap(strings)
        : [];

/** the files template.json points at, as written */
const filesOf = (tpl: Record<string, unknown>): string[] => {
  const sound = (tpl.sound ?? {}) as Record<string, unknown>;
  return [
    ...strings(tpl.scene),
    ...strings(tpl.story),
    ...strings(tpl.model),
    ...strings(tpl.character),
    ...strings(tpl.fonts),
    ...strings(tpl.models),
    ...strings(sound.music),
    ...strings(sound.soft),
    ...strings(sound.effects),
  ];
};

const templates = readdirSync(TEMPLATES).filter((id) =>
  existsSync(path.join(TEMPLATES, id, "template.json")),
);

describe("the files the real templates name", () => {
  it("finds the templates", () => {
    expect(templates.length).toBeGreaterThan(40);
  });

  it.each(templates)(
    "%s: every file it names is there, inside the templates",
    (id) => {
      const dir = path.join(TEMPLATES, id);
      const tpl = JSON.parse(
        readFileSync(path.join(dir, "template.json"), "utf8"),
      );
      const missing = filesOf(tpl).filter((f) => {
        const p = path.resolve(dir, f);
        return !p.startsWith(TEMPLATES + path.sep) || !existsSync(p);
      });
      expect(missing).toEqual([]);
    },
  );

  it("knows the shared birthday sounds the cards use", () => {
    const tpl = JSON.parse(
      readFileSync(
        path.join(TEMPLATES, "birthday-her", "template.json"),
        "utf8",
      ),
    );
    expect(filesOf(tpl)).toEqual(
      expect.arrayContaining([
        "../_sounds/birthday.mp3",
        "../_sounds/shutter.mp3",
      ]),
    );
  });
});
