/* The buyer's words, checked against the card they are for: only the slots the template's form writes, each within its
   length, one hint per stop at most. A slot left out keeps the form's own words, so the act is never blank by
   accident; a slot sent empty stays empty. Text is normalised (NFC, no control characters but line breaks). */
import type { z } from "zod";
import type { giftContentInputSchema } from "../api/dto";
import { LIMITS } from "../api/dto";
import { slotLimits, type FormSpec } from "../catalog/form";
import type { GiftContent } from "../domain/types";
import { InvalidInput } from "../orders/errors";

export type ParsedContent = z.output<typeof giftContentInputSchema>;

/** Plain text: NFC, \r\n as \n, no control characters but \n and \t. */
export function cleanText(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
}

const chars = (s: string) => [...s].length;

export function validateContent(
  input: ParsedContent,
  form: FormSpec | null,
): GiftContent {
  const issues: string[] = [];
  const limits = form ? slotLimits(form) : new Map<string, number>();

  const slots: Record<string, string> = {};
  if (form)
    for (const g of form.groups)
      for (const row of g.rows)
        for (const f of row)
          for (const s of ([] as string[]).concat(f.slot)) slots[s] = f.value;
  for (const [name, raw] of Object.entries(input.slots)) {
    const max = limits.get(name);
    if (max === undefined) {
      issues.push("Thiệp này không có một trong các ô chữ đã gửi.");
      continue;
    } // never echo what was sent
    const text = cleanText(raw).trim();
    if (chars(text) > max) {
      issues.push(`Một ô chữ dài quá: tối đa ${max} ký tự.`);
      continue;
    }
    slots[name] = text;
  }

  const letter = {
    to: cleanText(input.letter.to).trim(),
    body: input.letter.body.map((p) => cleanText(p).trim()).filter(Boolean),
    from: cleanText(input.letter.from).trim(),
  };
  if (!letter.body.length) issues.push("Thư cần ít nhất một đoạn.");
  if (letter.body.length > LIMITS.paragraphs)
    issues.push(`Thư tối đa ${LIMITS.paragraphs} đoạn.`);

  if (issues.length) throw new InvalidInput(issues);
  return {
    title: cleanText(input.title).trim(),
    intro: cleanText(input.intro).trim(),
    letter,
    slots,
    photoPaths: [
      ...new Set([
        ...input.photoPaths,
        ...(input.photoPath ? [input.photoPath] : []),
      ]),
    ].slice(0, LIMITS.photos),
  };
}
