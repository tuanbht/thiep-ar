/* The nightly sweep against the local Supabase (runs when SUPABASE_URL and SUPABASE_SECRET_KEY are set). Its rows are
   made two days old by hand; uploads cannot be, so the sweep is run "two days later" for them. */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { cleanupAbandoned } from "../cleanup";
import { createAdminClient } from "../client";
import { PHOTO_BUCKET } from "../photos";

const configured =
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;
const DAY = 24 * 3600_000;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe.skipIf(!configured)("cleanupAbandoned", () => {
  const db = configured ? createAdminClient() : null!;
  const made = {
    orders: [] as string[],
    cards: [] as string[],
    photos: [] as string[],
  };
  /** a card's content with its photo list; `legacy`: as cards were kept before photo lists, one photoPath */
  const content = (photos: string | string[] | null, legacy = false) => ({
    title: "t",
    intro: "",
    letter: { to: "a", body: ["b"], from: "c" },
    slots: {},
    ...(legacy
      ? { photoPath: photos }
      : { photoPaths: photos === null ? [] : [photos].flat() }),
  });

  async function photo(): Promise<string> {
    const path = `drafts/${randomUUID()}.png`;
    const { error } = await db.storage
      .from(PHOTO_BUCKET)
      .upload(path, PNG, { contentType: "image/png" });
    if (error) throw error;
    made.photos.push(path);
    return path;
  }

  async function purchase(
    ageMs: number,
    status: "pending" | "paid",
    photoPath: string | string[] | null,
    legacy = false,
  ) {
    const at = new Date(Date.now() - ageMs).toISOString();
    const slug = `Cl${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const { data: card, error: e1 } = await db
      .from("gift_cards")
      .insert({
        slug,
        product_id: "mochi",
        template: "mochi",
        design: null,
        content: content(photoPath, legacy),
        status: status === "paid" ? "active" : "draft",
        created_at: at,
      })
      .select("id")
      .single();
    if (e1) throw e1;
    const { data: order, error: e2 } = await db
      .from("orders")
      .insert({
        code: `GC-CLEAN-${randomUUID().slice(0, 8)}`,
        gift_card_id: card.id,
        product_id: "mochi",
        amount_vnd: 49000,
        status,
        access_token_hash: "x".repeat(64),
        created_at: at,
        paid_at: status === "paid" ? at : null,
      })
      .select("id")
      .single();
    if (e2) throw e2;
    made.cards.push(card.id);
    made.orders.push(order.id);
    return { card: card.id, order: order.id };
  }

  const exists = async (table: "orders" | "gift_cards", id: string) =>
    !!(await db.from(table).select("id").eq("id", id).maybeSingle()).data;
  const kept = async (path: string) =>
    (await db.storage.from(PHOTO_BUCKET).exists(path)).data === true;

  afterAll(async () => {
    await db.from("orders").delete().in("id", made.orders);
    await db.from("gift_cards").delete().in("id", made.cards);
    await db.storage.from(PHOTO_BUCKET).remove(made.photos);
  });

  it("removes what nobody paid for after a day, with its photo, and keeps the rest", async () => {
    const abandoned = await purchase(2 * DAY, "pending", await photo());
    const recent = await purchase(60_000, "pending", null);
    const paidPhoto = await photo();
    const paid = await purchase(2 * DAY, "paid", paidPhoto);
    const orphan = await photo(); // uploaded while writing, never ordered

    const r = await cleanupAbandoned(24, db, new Date(Date.now() + 2 * DAY));

    expect(r.orders).toBeGreaterThanOrEqual(1);
    expect(await exists("orders", abandoned.order)).toBe(false);
    expect(await exists("gift_cards", abandoned.card)).toBe(false);
    expect(await kept(made.photos[0])).toBe(false);
    expect(await kept(orphan)).toBe(false);
    expect(await exists("orders", recent.order)).toBe(true);
    expect(await exists("orders", paid.order)).toBe(true);
    expect(await exists("gift_cards", paid.card)).toBe(true);
    expect(await kept(paidPhoto)).toBe(true);
  });

  it("keeps a photo an abandoned try shares with a card someone paid for", async () => {
    const shared = await photo(); // a draft kept the photo: the first try was left, the second paid
    const left = await purchase(2 * DAY, "pending", shared);
    const paid = await purchase(2 * DAY, "paid", shared);

    await cleanupAbandoned(24, db, new Date(Date.now() + 2 * DAY));

    expect(await exists("orders", left.order)).toBe(false);
    expect(await exists("gift_cards", paid.card)).toBe(true);
    expect(await kept(shared)).toBe(true);
  });

  it("reads both ways a card keeps its photos: a list, or one photo from before lists", async () => {
    const [listed, older, shared] = [
      await photo(),
      await photo(),
      await photo(),
    ];
    const left = await purchase(2 * DAY, "pending", listed);
    const leftOld = await purchase(2 * DAY, "pending", older, true);
    await purchase(2 * DAY, "pending", shared, true); // left long ago, but a paid card shows the same photo
    await purchase(2 * DAY, "paid", shared);

    await cleanupAbandoned(24, db, new Date(Date.now() + 2 * DAY));

    expect(await exists("orders", left.order)).toBe(false);
    expect(await exists("orders", leftOld.order)).toBe(false);
    expect(await kept(listed)).toBe(false);
    expect(await kept(older)).toBe(false);
    expect(await kept(shared)).toBe(true);
  });

  it("takes a left card's photos one by one: those no other card shows go, one a paid card also shows stays", async () => {
    const [a, b, shared] = [await photo(), await photo(), await photo()];
    const left = await purchase(2 * DAY, "pending", [a, shared, b]);
    const paid = await purchase(2 * DAY, "paid", [shared]);

    const r = await cleanupAbandoned(24, db, new Date(Date.now() + 2 * DAY));

    expect(await exists("gift_cards", left.card)).toBe(false);
    expect(await exists("gift_cards", paid.card)).toBe(true);
    expect([await kept(a), await kept(b), await kept(shared)]).toEqual([
      false,
      false,
      true,
    ]);
    expect(r.photos).toBeGreaterThanOrEqual(2);
  });

  it("refuses a cut-off under an hour", async () => {
    await expect(cleanupAbandoned(0.5, db)).rejects.toThrow("at least an hour");
  });
});
