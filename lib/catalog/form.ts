/* A template's form (public/templates/<id>/form.json): what the buyer fills in and what it starts with.
     preset   the letter and start screen as they come (the buyer edits them)
     groups   fields for the act's words; each field writes one slot (or several: a sign and its caption)
   The words at the stops are not the buyer's: the player always says a tap plays on. */
import { z } from "zod";

const slotName = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/i);

export const formFieldSchema = z.object({
  slot: z.union([slotName, z.array(slotName).min(1)]),
  label: z.string(),
  value: z.string().default(""),
  max: z.number().int().positive().optional(),
  narrow: z.boolean().optional(),
  multiline: z.boolean().optional(),
});

export const formSpecSchema = z.object({
  label: z.string(),
  preset: z.object({
    title: z.string().default(""),
    intro: z.string().default(""),
    to: z.string().default(""),
    body: z.array(z.string()).default([]),
    from: z.string().default(""),
  }),
  groups: z
    .array(
      z.object({
        title: z.string(),
        note: z.string().optional(),
        rows: z.array(z.array(formFieldSchema)),
      }),
    )
    .default([]),
});

export type FormField = z.infer<typeof formFieldSchema>;
export type FormSpec = z.infer<typeof formSpecSchema>;

/** Every slot a form writes, with the longest words each may hold (a field's max, else DEFAULT_SLOT_MAX). */
export const DEFAULT_SLOT_MAX = 200;
export function slotLimits(form: FormSpec): Map<string, number> {
  const out = new Map<string, number>();
  for (const g of form.groups)
    for (const row of g.rows)
      for (const f of row) {
        for (const s of ([] as string[]).concat(f.slot))
          out.set(
            s,
            Math.min(out.get(s) ?? Infinity, f.max ?? DEFAULT_SLOT_MAX),
          );
      }
  return out;
}

/** The slots a field writes. */
export const slotsOf = (f: FormField): string[] =>
  ([] as string[]).concat(f.slot);
