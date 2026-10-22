/* The Repository's rules, as one suite every implementation must pass (memory always, Supabase when configured). */
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import type {
  Category,
  GiftContent,
  OrderStatus,
  Product,
} from "../../domain/types";
import { RepositoryError, StateError, type Repository } from "../repository";

export interface RepoFixture {
  repo: Repository;
  /** the words unique to this run (see testProducts) */
  run: string;
  /** already in the store: two active products (first sorts before second) and an inactive one */
  products: { first: Product; second: Product; hidden: Product };
  /** already in the store: a category with both active products, and one with only the inactive product */
  categories: { main: Category; spare: Category };
  /** test only: put an order into a status the Repository itself never sets (e.g. cancelled) */
  setOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
}

/** Ids unique to one test run, so runs against a shared database never collide. */
export const runId = () => randomBytes(5).toString("hex");

export function testCategories(run: string): RepoFixture["categories"] {
  return {
    main: {
      id: `t${run}-yeu`,
      name: `Tình yêu ${run}`,
      blurb: "Gửi người thương",
      sort: -2,
    },
    spare: { id: `t${run}-trong`, name: `Trống ${run}`, blurb: null, sort: -1 },
  };
}

/** The run's own word is in the second's name, the first's blurb and the hidden one's tags, so a search for it finds
    only this run's products, even in a shared database. */
export function testProducts(run: string): RepoFixture["products"] {
  const c = testCategories(run);
  const p = (
    suffix: string,
    sort: number,
    active: boolean,
    more: Partial<Product> = {},
  ): Product => ({
    id: `t${run}-${suffix}`,
    template: "flower-letter",
    design: null,
    name: `Test ${suffix}`,
    blurb: null,
    kind: "3d",
    priceVnd: 49000,
    active,
    sort,
    tags: [],
    categories: [c.main.id],
    ...more,
  });
  return {
    first: p("a", -2, true, {
      blurb: `Đèn trời ${run}`,
      tags: ["chiếc ô", "20/10", "múa"],
    }),
    second: p("b", -1, true, { name: `Đèn trời ${run}`, tags: ["mưa"] }),
    hidden: p("z", -3, false, {
      tags: [`đèn trời ${run}`],
      categories: [c.main.id, c.spare.id],
    }),
  };
}

const content = (title = "Gửi Hanna"): GiftContent => ({
  title,
  intro: "Mở ra nhé",
  letter: { to: "Hanna à,", body: ["Đoạn một.", "Đoạn hai."], from: "Yêu em" },
  slots: { board: "Happy Women's Day" },
  photoPaths: [],
});
const slug = () => randomBytes(9).toString("hex");
const code = () => `T-${randomBytes(6).toString("hex").toUpperCase()}`;
const tokenHash = () =>
  createHash("sha256").update(randomBytes(16)).digest("hex");
const PAID_AT = "2026-10-16T08:00:00.000Z";

export function repositoryContract(
  name: string,
  setup: () => Promise<RepoFixture>,
) {
  describe(`${name}: the Repository contract`, () => {
    let fx: RepoFixture;
    const fixture = async () => (fx ??= await setup());

    /** a draft gift card and its pending order */
    async function bought(price = 49000) {
      const { repo, products } = await fixture();
      const gift = await repo.createGiftCard({
        slug: slug(),
        productId: products.first.id,
        template: "flower-letter",
        design: null,
        content: content(),
      });
      const order = await repo.createOrder({
        code: code(),
        giftCardId: gift.id,
        productId: products.first.id,
        amountVnd: price,
        buyer: { name: "Tuấn", email: "tuan@example.com", phone: null },
        accessTokenHash: tokenHash(),
      });
      return { repo, gift, order };
    }
    const confirm = (orderId: string, ref: string, amountVnd = 49000) =>
      fx.repo.confirmPayment({
        orderId,
        provider: "test",
        providerRef: ref,
        amountVnd,
        raw: { via: "test" },
        paidAt: PAID_AT,
      });

    it("lists the active products in shelf order and hides the inactive ones", async () => {
      const { repo, products } = await fixture();
      const mine = (await repo.listProducts()).filter((p) =>
        p.id.startsWith(products.first.id.slice(0, -1)),
      );
      expect(mine).toEqual([products.first, products.second]);
      expect(await repo.getProduct(products.hidden.id)).toEqual(
        products.hidden,
      ); // still there, only off the shelf
    });

    it("finds products by their words, accents and case optional, each word the start of one, the name first", async () => {
      const { repo, products, run } = await fixture();
      const ids = async (query: string) =>
        (await repo.listProducts({ query }))
          .map((p) => p.id)
          .filter((id) => id.startsWith(`t${run}`));
      const [a, b] = [products.first.id, products.second.id];
      expect(await ids(`DEN TROI ${run}`)).toEqual([b, a]); // b has the words in its name, a in its blurb
      expect(await ids(`đèn tr ${run.slice(0, 6)}`)).toEqual([b, a]); // the start of a word is enough
      expect(await ids(`đèn trời ${run} biển`)).toEqual([]); // every word must match
      expect((await ids(`tình yêu ${run}`)).sort()).toEqual([a, b].sort()); // its category's name counts
      expect(await ids(`chiec o ${run}`)).toEqual([a]); // its tags count
      expect(await ids(`20/10 ${run}`)).toEqual([a]); // written the way people write it
      expect(await ids("mưa")).toEqual([b, a]); // both fold to "mua"; b has it as typed
      expect(await ids("múa")).toEqual([a, b]);
    });

    it("keeps to the category picked, and lists the categories that have products on sale", async () => {
      const { repo, products, categories, run } = await fixture();
      const [a, b] = [products.first.id, products.second.id];
      expect(
        (await repo.listProducts({ category: categories.main.id })).map(
          (p) => p.id,
        ),
      ).toEqual([a, b]);
      expect(
        await repo.listProducts({ category: categories.spare.id }),
      ).toEqual([]); // only an inactive product in it
      expect(
        (
          await repo.listProducts({
            query: `chiec o ${run}`,
            category: categories.main.id,
          })
        ).map((p) => p.id),
      ).toEqual([a]);
      expect(
        (await repo.listCategories()).filter((c) => c.id.startsWith(`t${run}`)),
      ).toEqual([{ ...categories.main, count: 2 }]);
    });

    it("takes whatever is typed without failing; nothing searchable lists everything", async () => {
      const { repo } = await fixture();
      for (const query of [
        `'):* & | !( "x" <-> \\`,
        "ô".repeat(300),
        "a b c d e f g h i j k",
        "mưa\u0000rào",
        "\u0000",
      ]) {
        await expect(repo.listProducts({ query })).resolves.toBeInstanceOf(
          Array,
        );
      }
      expect(
        (await repo.listProducts({ query: "  !!! " })).map((p) => p.id),
      ).toEqual((await repo.listProducts()).map((p) => p.id));
    });

    it("finds a product by id, or nothing", async () => {
      const { repo, products } = await fixture();
      expect(await repo.getProduct(products.second.id)).toEqual(
        products.second,
      );
      expect(await repo.getProduct("no-such-product")).toBeNull();
    });

    it("creates a draft gift card and finds it by id and by slug", async () => {
      const { repo, products } = await fixture();
      const s = slug();
      const g = await repo.createGiftCard({
        slug: s,
        productId: products.first.id,
        template: "flower-letter",
        design: null,
        content: content("Gửi Linh"),
      });
      expect(g).toMatchObject({
        slug: s,
        productId: products.first.id,
        template: "flower-letter",
        design: null,
        status: "draft",
        activatedAt: null,
      });
      expect(g.content).toEqual(content("Gửi Linh"));
      expect(new Date(g.createdAt).toISOString()).toBe(g.createdAt);
      expect(await repo.getGiftCard(g.id)).toEqual(g);
      expect(await repo.getGiftCardBySlug(s)).toEqual(g);
    });

    it("finds no gift card for an unknown or malformed id or slug", async () => {
      const { repo } = await fixture();
      expect(
        await repo.getGiftCard("00000000-0000-4000-8000-000000000000"),
      ).toBeNull();
      expect(await repo.getGiftCard("not-a-uuid")).toBeNull();
      expect(await repo.getGiftCardBySlug("NoSuchSlug1")).toBeNull();
    });

    it("refuses a slug that is taken, and a product that does not exist", async () => {
      const { repo, products } = await fixture();
      const s = slug();
      await repo.createGiftCard({
        slug: s,
        productId: products.first.id,
        template: "flower-letter",
        design: null,
        content: content(),
      });
      await expect(
        repo.createGiftCard({
          slug: s,
          productId: products.first.id,
          template: "flower-letter",
          design: null,
          content: content(),
        }),
      ).rejects.toBeInstanceOf(RepositoryError);
      await expect(
        repo.createGiftCard({
          slug: slug(),
          productId: "no-such-product",
          template: "flower-letter",
          design: null,
          content: content(),
        }),
      ).rejects.toBeInstanceOf(RepositoryError);
    });

    it("creates a pending order and finds it; an order code is used once", async () => {
      const { repo, gift, order } = await bought();
      expect(order).toMatchObject({
        giftCardId: gift.id,
        amountVnd: 49000,
        status: "pending",
        buyer: { name: "Tuấn", email: "tuan@example.com", phone: null },
        paymentProvider: null,
        paymentRef: null,
        paidAt: null,
      });
      expect(await repo.getOrder(order.id)).toEqual(order);
      expect(
        await repo.getOrder("00000000-0000-4000-8000-000000000000"),
      ).toBeNull();
      expect(await repo.getOrder("not-a-uuid")).toBeNull();
      expect(await repo.getOrderByCode(order.code)).toEqual(order);
      expect(await repo.getOrderByCode("GC-000000-ZZZZZ")).toBeNull();
      expect(await repo.getOrderByCode("' or 1=1 --")).toBeNull();
      await expect(
        repo.createOrder({
          code: order.code,
          giftCardId: gift.id,
          productId: order.productId,
          amountVnd: 1,
          buyer: order.buyer,
          accessTokenHash: tokenHash(),
        }),
      ).rejects.toBeInstanceOf(RepositoryError);
    });

    it("remembers how a payment was started, while the order stays pending", async () => {
      const { repo, order } = await bought();
      const o = await repo.setOrderPayment(order.id, "sepay", "261016_abc");
      expect(o).toMatchObject({
        status: "pending",
        paymentProvider: "sepay",
        paymentRef: "261016_abc",
      });
      await expect(
        repo.setOrderPayment(
          "00000000-0000-4000-8000-000000000000",
          "test",
          "x",
        ),
      ).rejects.toBeInstanceOf(RepositoryError);
    });

    it("confirms a payment: the order is paid, its gift card active, the payment recorded", async () => {
      const { repo, gift, order } = await bought();
      const r = await confirm(order.id, `ref-${slug()}`);
      expect(r.alreadyPaid).toBe(false);
      expect(r.order).toMatchObject({
        id: order.id,
        status: "paid",
        paidAt: PAID_AT,
        paymentProvider: "test",
      });
      expect(r.order.paymentRef).toBe(r.payment.providerRef);
      expect(r.giftCard).toMatchObject({
        id: gift.id,
        status: "active",
        activatedAt: PAID_AT,
      });
      expect(r.payment).toMatchObject({
        orderId: order.id,
        provider: "test",
        amountVnd: 49000,
        status: "succeeded",
        raw: { via: "test" },
      });
      expect(await repo.getOrder(order.id)).toEqual(r.order);
      expect(await repo.getGiftCardBySlug(gift.slug)).toEqual(r.giftCard);
      await expect(
        repo.setOrderPayment(order.id, "test", "late"),
      ).rejects.toBeInstanceOf(StateError);
    });

    it("takes the same payment again as a repeat: nothing changes", async () => {
      const { order } = await bought();
      const ref = `ref-${slug()}`;
      const first = await confirm(order.id, ref);
      const again = await confirm(order.id, ref);
      expect(again.alreadyPaid).toBe(true);
      expect(again.payment).toEqual(first.payment);
      expect(again.order).toEqual(first.order);
      expect(again.giftCard).toEqual(first.giftCard);
    });

    it("refuses another payment for an order already paid", async () => {
      const { order } = await bought();
      await confirm(order.id, `ref-${slug()}`);
      await expect(confirm(order.id, `ref-${slug()}`)).rejects.toBeInstanceOf(
        StateError,
      );
    });

    it("refuses a payment of the wrong amount, and the order stays pending", async () => {
      const { repo, gift, order } = await bought();
      await expect(
        confirm(order.id, `ref-${slug()}`, 1000),
      ).rejects.toBeInstanceOf(StateError);
      expect((await repo.getOrder(order.id))?.status).toBe("pending");
      expect((await repo.getGiftCard(gift.id))?.status).toBe("draft");
    });

    it("refuses a payment for an order that is not pending", async () => {
      const { repo, gift, order } = await bought();
      await fx.setOrderStatus(order.id, "cancelled");
      await expect(confirm(order.id, `ref-${slug()}`)).rejects.toBeInstanceOf(
        StateError,
      );
      expect((await repo.getGiftCard(gift.id))?.status).toBe("draft");
    });

    it("refuses a payment for an order that does not exist", async () => {
      await fixture();
      await expect(
        confirm("00000000-0000-4000-8000-000000000000", `ref-${slug()}`),
      ).rejects.toBeInstanceOf(StateError);
    });

    it("lets one provider payment pay one order only", async () => {
      const a = await bought(),
        b = await bought();
      const ref = `ref-${slug()}`;
      await confirm(a.order.id, ref);
      await expect(confirm(b.order.id, ref)).rejects.toBeInstanceOf(StateError);
      expect((await b.repo.getOrder(b.order.id))?.status).toBe("pending");
    });
  });
}
