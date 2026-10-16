/* A buyer's gift content as the player's card: the shape lib/player plays (the same one the old kit's cards had).
   Pure, so the shop's live preview (browser) and the gift page (server) build it alike. */
import { mergeCard, type Card } from '../player/core/card';
import type { GiftContent, Product } from '../domain/types';
import type { FormSpec } from '../catalog/form';

/** The words a template starts with, as gift content: what the shop's form opens with. */
export function presetContent(form: FormSpec): GiftContent {
  const slots: Record<string, string> = {};
  for (const g of form.groups) for (const row of g.rows) for (const f of row) for (const s of ([] as string[]).concat(f.slot)) slots[s] = f.value;
  return {
    title: form.preset.title,
    intro: form.preset.intro,
    letter: { to: form.preset.to, body: [...form.preset.body], from: form.preset.from },
    slots,
    photoPath: null
  };
}

/** `photoUrl`: where the browser can fetch the photo now (a signed link, or a local object URL in the preview). */
export function toCard(content: GiftContent, product: Pick<Product, 'template' | 'design'>, photoUrl: string | null): Card {
  return mergeCard({
    template: product.template,
    design: product.design ?? undefined,
    title: content.title,
    intro: content.intro,
    seal: initials(content.letter.from || content.title),
    greeting: content.letter.to,
    letter: content.letter,
    photo: photoUrl ?? '',
    slots: content.slots
  });
}

/** Two letters for the envelope's wax seal. */
export function initials(text: string): string {
  const words = text.normalize('NFC').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const two = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '').slice(0, 2);
  return two.toUpperCase() || '♥';
}
