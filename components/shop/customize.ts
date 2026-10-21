/* The customise form's logic, apart from its screen: the form's values (what react-hook-form edits), the rules they
   must meet (a zod schema built from the template's own fields), and the gift content and order request they become. */
import { z } from "zod";
import { LIMITS, type CreateOrderRequest } from "@/lib/api/dto";
import {
  DEFAULT_SLOT_MAX,
  slotsOf,
  type FormField,
  type FormSpec,
} from "@/lib/catalog/form";
import type { GiftContent } from "@/lib/domain/types";
import { presetContent } from "@/lib/content/toCard";
import { S } from "./strings";

/** What the form edits. A field that fills several slots (a sign and its caption) is one value, under its first slot. */
export interface CustomizeValues {
  title: string;
  intro: string;
  to: string;
  /** the letter's paragraphs (objects, as useFieldArray needs) */
  body: { text: string }[];
  from: string;
  words: Record<string, string>;
}

/** Every field of the template's form, in order. */
export const allFields = (groups: FormSpec["groups"]): FormField[] =>
  groups.flatMap((g) => g.rows.flat());

/** The name a field's words go under in the form's values. */
export const fieldKey = (f: FormField): string => slotsOf(f)[0];

/** The form as the template's words start it. */
export function formDefaults(form: FormSpec): CustomizeValues {
  const c = presetContent(form);
  return {
    title: c.title,
    intro: c.intro,
    to: c.letter.to,
    body: (c.letter.body.length ? c.letter.body : [""]).map((text) => ({
      text,
    })),
    from: c.letter.from,
    words: Object.fromEntries(
      allFields(form.groups).map((f) => [
        fieldKey(f),
        c.slots[fieldKey(f)] ?? "",
      ]),
    ),
  };
}

const longest = (max: number) => z.string().max(max, S.product.tooLong(max));
const needed = (max: number) =>
  z.string().trim().min(1, S.product.required).max(max, S.product.tooLong(max));

/** The rules the form's values must meet: the same as the server's (lib/content/validate.ts), in the buyer's words. */
export function customizeSchema(fields: FormField[]) {
  return z.object({
    title: needed(LIMITS.title),
    intro: longest(LIMITS.intro),
    to: needed(LIMITS.to),
    body: z
      .array(z.object({ text: longest(LIMITS.paragraph) }))
      .max(LIMITS.paragraphs)
      .superRefine((ps, ctx) => {
        if (!ps.some((p) => p.text.trim()))
          ctx.addIssue({
            code: "custom",
            path: [0, "text"],
            message: S.product.required,
          }); // one paragraph at least
      }),
    from: needed(LIMITS.from),
    words: z.object(
      Object.fromEntries(
        fields.map((f) => [fieldKey(f), longest(f.max ?? DEFAULT_SLOT_MAX)]),
      ),
    ),
  });
}

/** The form's values as gift content: each field's words written into every slot it fills. */
export function toContent(
  v: CustomizeValues,
  fields: FormField[],
  photoPaths: readonly string[],
): GiftContent {
  const slots: Record<string, string> = {};
  for (const f of fields)
    for (const s of slotsOf(f)) slots[s] = v.words?.[fieldKey(f)] ?? "";
  return {
    title: v.title ?? "",
    intro: v.intro ?? "",
    letter: {
      to: v.to ?? "",
      body: (v.body ?? []).map((p) => p?.text ?? ""),
      from: v.from ?? "",
    },
    slots,
    photoPaths: [...photoPaths],
  };
}

/** The order request for this content: trimmed, empty paragraphs dropped, only the form's own slots sent. */
export function orderRequest(
  productId: string,
  content: GiftContent,
  fields: FormField[],
): CreateOrderRequest {
  const slots: Record<string, string> = {};
  for (const f of fields)
    for (const s of slotsOf(f)) slots[s] = (content.slots[s] ?? "").trim();
  return {
    productId,
    content: {
      title: content.title.trim(),
      intro: content.intro.trim(),
      letter: {
        to: content.letter.to.trim(),
        body: content.letter.body.map((p) => p.trim()).filter(Boolean),
        from: content.letter.from.trim(),
      },
      slots,
      photoPaths: content.photoPaths,
    },
  };
}
