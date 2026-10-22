/* The Repository contract against Supabase. Runs when SUPABASE_URL and SUPABASE_SECRET_KEY are set (pnpm db:start,
   then .env.local); its rows carry this run's own ids and are deleted afterwards. */
import { afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import type { OrderStatus, PaymentProviderId } from "../../domain/types";
import { createAdminClient, supabaseConfig, ConfigError } from "../client";
import {
  repositoryContract,
  runId,
  testCategories,
  testProducts,
} from "./repository.contract";
import { RepositoryError } from "../repository";
import { SupabaseRepository } from "../supabase-repository";

const configured =
  !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SECRET_KEY;

describe("supabaseConfig", () => {
  it("names whatever is missing", () => {
    expect(() => supabaseConfig({})).toThrow(ConfigError);
    expect(() => supabaseConfig({})).toThrow(
      "set SUPABASE_URL and SUPABASE_SECRET_KEY",
    );
    expect(() => supabaseConfig({ SUPABASE_URL: "http://x" })).toThrow(
      "set SUPABASE_SECRET_KEY (",
    );
    expect(
      supabaseConfig({ SUPABASE_URL: " http://x ", SUPABASE_SECRET_KEY: "k" }),
    ).toEqual({ url: "http://x", key: "k" });
  });
});

describe.skipIf(!configured)("Supabase", () => {
  const run = runId();
  const products = testProducts(run),
    categories = testCategories(run);
  const db = configured ? createAdminClient() : null!;

  repositoryContract("SupabaseRepository", async () => {
    const all = [products.first, products.second, products.hidden];
    const steps = [
      () => db.from("categories").insert([categories.main, categories.spare]),
      () =>
        db.from("products").insert(
          all.map((p) => ({
            id: p.id,
            template: p.template,
            design: p.design,
            name: p.name,
            blurb: p.blurb,
            kind: p.kind,
            price_vnd: p.priceVnd,
            active: p.active,
            sort: p.sort,
            tags: p.tags,
          })),
        ),
      () =>
        db
          .from("product_categories")
          .insert(
            all.flatMap((p) =>
              p.categories.map((c) => ({ product_id: p.id, category_id: c })),
            ),
          ),
    ];
    for (const step of steps) {
      const { error } = await step();
      if (error)
        throw new Error(`could not add the test products: ${error.message}`);
    }
    return {
      repo: new SupabaseRepository(db),
      run,
      products,
      categories,
      async setOrderStatus(orderId: string, status: OrderStatus) {
        const { error: e } = await db
          .from("orders")
          .update({ status })
          .eq("id", orderId);
        if (e) throw new Error(e.message);
      },
    };
  });

  const anon =
    process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  it.skipIf(!anon)(
    "keeps the public roles out: a public key reads nothing and searches nothing",
    async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const pub = createClient(process.env.SUPABASE_URL!, anon!, {
        auth: { persistSession: false },
      });
      for (const table of ["products", "categories", "product_categories"]) {
        const { data, error } = await pub.from(table).select("*").limit(1);
        expect(error ?? data?.length === 0, table).toBeTruthy();
      }
      for (const fn of ["search_products", "shelf_categories"])
        expect((await pub.rpc(fn)).error, fn).toBeTruthy();
    },
  );

  it("takes any provider the app names, with no migration, and refuses a malformed one", async () => {
    const repo = new SupabaseRepository(db); // the contract above has put the products in
    const gift = await repo.createGiftCard({
      slug: randomBytes(9).toString("hex"),
      productId: products.first.id,
      template: "flower-letter",
      design: null,
      content: {
        title: "t",
        intro: "",
        letter: { to: "a", body: ["b"], from: "c" },
        slots: {},
        photoPaths: [],
      },
    });
    const order = await repo.createOrder({
      code: `T-${randomBytes(6).toString("hex").toUpperCase()}`,
      giftCardId: gift.id,
      productId: products.first.id,
      amountVnd: 49000,
      buyer: { name: null, email: null, phone: null },
      accessTokenHash: "a".repeat(64),
    });
    const someday = "momo_qr" as PaymentProviderId;
    for (const bad of ["MoMo", "momo pay", "x", "sepay'; --"])
      await expect(
        repo.setOrderPayment(order.id, bad as PaymentProviderId, "ref-2"),
        bad,
      ).rejects.toBeInstanceOf(RepositoryError);
    expect(
      await repo.setOrderPayment(order.id, someday, "ref-1"),
    ).toMatchObject({ paymentProvider: "momo_qr" });
    const paid = await repo.confirmPayment({
      orderId: order.id,
      provider: someday,
      providerRef: "ref-1",
      amountVnd: 49000,
      raw: {},
      paidAt: new Date().toISOString(),
    });
    expect(paid.order).toMatchObject({
      status: "paid",
      paymentProvider: "momo_qr",
    });
  });

  it("reads a card saved before photo lists: its one photo becomes the list", async () => {
    const path = "drafts/00000000-0000-4000-8000-00000000abcd.jpg";
    const { data, error } = await db
      .from("gift_cards")
      .insert({
        slug: randomBytes(9).toString("hex"),
        product_id: products.first.id,
        template: "flower-letter",
        content: {
          title: "t",
          intro: "",
          letter: { to: "a", body: ["b"], from: "c" },
          slots: {},
          photoPath: path,
        },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    expect(
      (await new SupabaseRepository(db).getGiftCard(data.id))!.content
        .photoPaths,
    ).toEqual([path]);
    await db.from("gift_cards").delete().eq("id", data.id);
  });

  afterAll(async () => {
    const ids = [products.first.id, products.second.id, products.hidden.id];
    const { data: orders } = await db
      .from("orders")
      .select("id, gift_card_id")
      .in("product_id", ids);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length) {
      await db.from("payments").delete().in("order_id", orderIds);
      await db.from("orders").delete().in("id", orderIds);
    }
    const { data: gifts } = await db
      .from("gift_cards")
      .select("id")
      .in("product_id", ids);
    const giftIds = (gifts ?? []).map((g) => g.id);
    if (giftIds.length) {
      await db.from("gift_cards").delete().in("id", giftIds);
    }
    await db.from("products").delete().in("id", ids); // their category links go with them
    await db
      .from("categories")
      .delete()
      .in("id", [categories.main.id, categories.spare.id]);
  });
});
