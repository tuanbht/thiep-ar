import { describe, expect, it, vi } from "vitest";
import { createOrderRequestSchema } from "../../api/dto";
import {
  RepositoryError,
  StateError,
  UniqueViolation,
} from "../../db/repository";
import { PaymentUnavailable } from "../../payments/provider";
import { AccessDenied, InvalidInput, NotFound, TooLarge } from "../errors";
import { SLUG_RE } from "../ids";
import {
  catalog,
  FIXED_NOW,
  flowerOrder,
  JPEG,
  makeService,
  PNG,
} from "./test-kit";

const ORIGIN = "http://localhost:3000";
const parse = (o: Record<string, unknown> = {}) =>
  createOrderRequestSchema.parse(flowerOrder(o));

async function bought(over: Parameters<typeof makeService>[0] = {}) {
  const kit = makeService(over);
  const { response, accessToken } = await kit.orders.createOrder(parse());
  return { ...kit, ...response, accessToken };
}

describe("OrdersService: buying a card", () => {
  it("lists the products for sale, in shop order", async () => {
    const { orders } = makeService();
    expect((await orders.listProducts()).map((p) => p.id)).toEqual([
      "flower-letter",
      "mochi",
      "ghost",
    ]);
    expect((await orders.getProduct("retired"))?.active).toBe(false);
  });

  it("makes a draft gift with an unguessable link and a pending order at the product's price", async () => {
    const { repo, orderId, code, checkoutUrl, accessToken } = await bought();
    expect(code).toMatch(/^GC-261017-[2-9A-HJKMNP-Z]{5}$/);
    expect(checkoutUrl).toBe(`/checkout/${orderId}`);
    expect(accessToken.length).toBeGreaterThanOrEqual(43);
    const order = (await repo.getOrder(orderId))!;
    expect(order).toMatchObject({
      status: "pending",
      amountVnd: 49000,
      productId: "flower-letter",
      buyer: { name: null, email: null, phone: null },
    });
    expect(order.accessTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(order.accessTokenHash).not.toContain(accessToken);
    const gift = (await repo.getGiftCard(order.giftCardId))!;
    expect(gift.status).toBe("draft");
    expect(gift.slug).toMatch(SLUG_RE);
    expect(gift.content.slots.board).toBe("Happy Women's Day Hanna");
    expect(gift.content.letter.body).toEqual([
      "Nhân ngày 20/10, anh muốn nói...",
      "Yêu em.",
    ]);
  });

  it("keeps the buyer's contact", async () => {
    const { orders, repo } = makeService();
    const { response } = await orders.createOrder(
      parse({
        buyer: {
          name: " Tuấn ",
          email: "tuan@example.com",
          phone: "0901 234 567",
        },
      }),
    );
    expect((await repo.getOrder(response.orderId))!.buyer).toEqual({
      name: "Tuấn",
      email: "tuan@example.com",
      phone: "0901 234 567",
    });
  });

  it("refuses a product that is not for sale, or whose template is gone", async () => {
    const { orders } = makeService();
    await expect(
      orders.createOrder(parse({ productId: "retired" })),
    ).rejects.toThrow(NotFound);
    await expect(
      orders.createOrder(parse({ productId: "nope" })),
    ).rejects.toThrow(NotFound);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      orders.createOrder(parse({ productId: "ghost" })),
    ).rejects.toThrow(NotFound);
    log.mockRestore();
  });

  it("refuses words the card cannot show", async () => {
    const { orders } = makeService();
    await expect(
      orders.createOrder(
        parse({ content: { ...flowerOrder().content, slots: { sign0: "x" } } }),
      ),
    ).rejects.toThrow(InvalidInput);
  });

  it("draws the link again when it clashes, and gives up after a few tries", async () => {
    const kit = makeService();
    const real = kit.repo.createGiftCard.bind(kit.repo);
    let clashes = 2;
    kit.repo.createGiftCard = async (g) => {
      if (clashes-- > 0) throw new UniqueViolation("duplicate slug");
      return real(g);
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(kit.orders.createOrder(parse())).resolves.toBeTruthy();
    clashes = 99;
    await expect(kit.orders.createOrder(parse())).rejects.toThrow(
      UniqueViolation,
    );
    warn.mockRestore();
  });

  it("does not retry a storage failure that is not a clash", async () => {
    const kit = makeService();
    let calls = 0;
    kit.repo.createGiftCard = async () => {
      calls++;
      throw new RepositoryError("the database is down");
    };
    await expect(kit.orders.createOrder(parse())).rejects.toThrow(
      "the database is down",
    );
    expect(calls).toBe(1);
  });
});

describe("OrdersService: the order and paying it", () => {
  it("shows the order to the browser that made it, without the link until it is paid", async () => {
    const { orders, orderId, accessToken, code } = await bought();
    expect(await orders.getOrderView(orderId, accessToken, ORIGIN)).toEqual({
      id: orderId,
      code,
      status: "pending",
      amountVnd: 49000,
      product: {
        id: "flower-letter",
        name: "Thư hoa",
        template: "flower-letter",
      },
      createdAt: FIXED_NOW.toISOString(),
      paidAt: null,
      giftUrl: null,
    });
  });

  it("refuses another browser, and an id that is not an order", async () => {
    const { orders, orderId } = await bought();
    await expect(orders.getOrderView(orderId, null, ORIGIN)).rejects.toThrow(
      AccessDenied,
    );
    await expect(orders.getOrderView(orderId, "guess", ORIGIN)).rejects.toThrow(
      AccessDenied,
    );
    await expect(orders.getOrderView("not-an-id", "x", ORIGIN)).rejects.toThrow(
      NotFound,
    );
    await expect(
      orders.getOrderView("00000000-0000-4000-8000-000000000000", "x", ORIGIN),
    ).rejects.toThrow(NotFound);
    await expect(orders.startPayment(orderId, "guess", ORIGIN)).rejects.toThrow(
      AccessDenied,
    );
  });

  it("pays with the test provider: the order is paid, the gift active, the link shown", async () => {
    const { orders, repo, orderId, accessToken } = await bought();
    expect(await orders.startPayment(orderId, accessToken, ORIGIN)).toEqual({
      redirect: `/orders/${orderId}`,
    });
    const view = await orders.getOrderView(orderId, accessToken, ORIGIN);
    expect(view.status).toBe("paid");
    expect(view.paidAt).toBe(FIXED_NOW.toISOString());
    const gift = (await repo.getGiftCard(
      (await repo.getOrder(orderId))!.giftCardId,
    ))!;
    expect(gift.status).toBe("active");
    expect(view.giftUrl).toBe(`${ORIGIN}/g/${gift.slug}`);
    expect(repo.paymentsOf(orderId)).toHaveLength(1);
  });

  it("puts the configured site address in the link, not the request's", async () => {
    const { orders, orderId, accessToken } = await bought({
      siteUrl: "https://thiep.example.vn",
    });
    await orders.startPayment(orderId, accessToken, "http://10.0.0.5:3000");
    expect(
      (await orders.getOrderView(orderId, accessToken, "http://10.0.0.5:3000"))
        .giftUrl,
    ).toMatch(/^https:\/\/thiep\.example\.vn\/g\/[0-9A-Za-z]{10}$/);
  });

  it("pressing Pay again after paying leads back to the order and pays nothing twice", async () => {
    const { orders, repo, orderId, accessToken } = await bought();
    await orders.startPayment(orderId, accessToken, ORIGIN);
    expect(await orders.startPayment(orderId, accessToken, ORIGIN)).toEqual({
      redirect: `/orders/${orderId}`,
    });
    expect(repo.paymentsOf(orderId)).toHaveLength(1);
  });

  it("a provider confirming twice (a retried callback) counts once", async () => {
    const { orders, repo, orderId } = await bought();
    const c = {
      orderId,
      provider: "test" as const,
      providerRef: "zp_1",
      amountVnd: 49000,
      raw: {},
      paidAt: FIXED_NOW.toISOString(),
    };
    expect((await orders.confirmPayment(c)).alreadyPaid).toBe(false);
    expect((await orders.confirmPayment(c)).alreadyPaid).toBe(true);
    expect(repo.paymentsOf(orderId)).toHaveLength(1);
    await expect(
      orders.confirmPayment({ ...c, providerRef: "zp_2" }),
    ).rejects.toThrow(StateError);
  });

  it("refuses a payment for another amount", async () => {
    const { orders, orderId } = await bought();
    await expect(
      orders.confirmPayment({
        orderId,
        provider: "test",
        providerRef: "zp_1",
        amountVnd: 1000,
        raw: {},
        paidAt: FIXED_NOW.toISOString(),
      }),
    ).rejects.toThrow(StateError);
  });

  it("answers Payment unavailable when no provider is configured", async () => {
    const { orders, orderId, accessToken } = await bought({
      makeProvider: () => {
        throw new PaymentUnavailable("SEPAY_API_KEY is not set");
      },
    });
    await expect(
      orders.startPayment(orderId, accessToken, ORIGIN),
    ).rejects.toThrow(PaymentUnavailable);
  });

  it("follows a provider that sends the buyer to its gateway", async () => {
    const { orders, orderId, accessToken } = await bought({
      makeProvider: () => ({
        id: "sepay",
        redirectHosts: ["gateway.example"],
        start: async () => ({
          kind: "redirect",
          url: "https://gateway.example/pay/abc",
        }),
      }),
    });
    expect(await orders.startPayment(orderId, accessToken, ORIGIN)).toEqual({
      redirect: "https://gateway.example/pay/abc",
    });
  });

  it("never sends the buyer to a host the provider does not own, or over plain http", async () => {
    for (const url of [
      "https://evil.example/pay",
      "http://gateway.example/pay",
      "javascript:alert(1)",
    ]) {
      const { orders, orderId, accessToken } = await bought({
        makeProvider: () => ({
          id: "sepay",
          redirectHosts: ["gateway.example"],
          start: async () => ({ kind: "redirect", url }),
        }),
      });
      await expect(
        orders.startPayment(orderId, accessToken, ORIGIN),
        url,
      ).rejects.toThrow("does not own");
    }
  });
});

describe("OrdersService: the gift", () => {
  it("opens only once it is paid, as the player's card", async () => {
    const { orders, repo, orderId, accessToken } = await bought();
    const slug = (await repo.getGiftCard(
      (await repo.getOrder(orderId))!.giftCardId,
    ))!.slug;
    expect(await orders.getGift(slug)).toBeNull();
    await orders.startPayment(orderId, accessToken, ORIGIN);
    const g = (await orders.getGift(slug))!;
    expect(g.product.id).toBe("flower-letter");
    expect(g.card).toMatchObject({
      template: "flower-letter",
      theme: "blush", // a love card opens pink from its first frame
      title: "Gửi Hanna",
      greeting: "Hanna à,",
      photo: "",
      slots: { board: "Happy Women's Day Hanna" },
      letter: { to: "Hanna à,", from: "Anh" },
    });
    expect(g.card).not.toHaveProperty("chapters");
  });

  it("still opens when its template cannot be read, leaving the theme to the player", async () => {
    let gone = false; // the template's files go missing after the gift was bought
    const kit = makeService({
      templates: async (id) => {
        if (gone) throw new Error("disk gone");
        return catalog.getTemplateInfo(id);
      },
    });
    const { response, accessToken } = await kit.orders.createOrder(
      parse(flowerOrder()),
    );
    await kit.orders.startPayment(response.orderId, accessToken, ORIGIN);
    const slug = (await kit.repo.getGiftCard(
      (await kit.repo.getOrder(response.orderId))!.giftCardId,
    ))!.slug;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    gone = true;
    const g = (await kit.orders.getGift(slug))!;
    expect(g.card.title).toBe("Gửi Hanna");
    expect(g.card).not.toHaveProperty("theme");
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("could not be read"),
      expect.any(Error),
    );
    log.mockRestore();
  });

  it("knows nothing of a slug that is malformed or not there", async () => {
    const { orders } = makeService();
    expect(await orders.getGift("short")).toBeNull();
    expect(await orders.getGift("../../etc/x")).toBeNull();
    expect(await orders.getGift("AAAAAAAAAA")).toBeNull();
  });

  it("gives each photo as a link that lasts an hour, leaves out one it cannot sign, and still opens", async () => {
    const kit = makeService();
    const [a, b] = [
      (await kit.orders.uploadPhoto(JPEG)).photoPath,
      (await kit.orders.uploadPhoto(JPEG)).photoPath,
    ];
    const link = (p: string) => `https://storage.test/${p}?expires=3600`;
    const content = { ...flowerOrder().content, photoPaths: [a, b] };
    const { response, accessToken } = await kit.orders.createOrder(
      parse({ content }),
    );
    await kit.orders.startPayment(response.orderId, accessToken, ORIGIN);
    const slug = (await kit.repo.getGiftCard(
      (await kit.repo.getOrder(response.orderId))!.giftCardId,
    ))!.slug;
    expect((await kit.orders.getGift(slug))!.card).toMatchObject({
      photos: [link(a), link(b)],
      photo: link(a),
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const sign = kit.photos.signedUrl.bind(kit.photos);
    kit.photos.signedUrl = async (p, s) => {
      if (p === a) throw new Error("gone");
      return sign(p, s);
    };
    expect((await kit.orders.getGift(slug))!.card).toMatchObject({
      photos: [link(b)],
      photo: link(b),
    });
    kit.photos.signedUrl = async () => {
      throw new Error("storage down");
    };
    expect((await kit.orders.getGift(slug))!.card).toMatchObject({
      photos: [],
      photo: "",
    });
    log.mockRestore();
  });

  it("will not take an order whose photo is gone, naming none", async () => {
    const kit = makeService();
    const [a, b] = [
      (await kit.orders.uploadPhoto(JPEG)).photoPath,
      (await kit.orders.uploadPhoto(JPEG)).photoPath,
    ];
    kit.photos.kept.delete(b);
    await expect(
      kit.orders.createOrder(
        parse({ content: { ...flowerOrder().content, photoPaths: [a, b] } }),
      ),
    ).rejects.toThrow(InvalidInput);
  });
});

describe("OrdersService: photos", () => {
  it("keeps a JPEG, PNG or WebP and answers its path and a preview link", async () => {
    const { orders, photos } = makeService();
    const r = await orders.uploadPhoto(PNG);
    expect(r.photoPath).toMatch(/^drafts\/[0-9a-f-]{36}\.png$/);
    expect(r.previewUrl).toBe(
      `https://storage.test/${r.photoPath}?expires=3600`,
    );
    expect(photos.kept.get(r.photoPath)).toEqual(PNG);
  });

  it("refuses what is not a photo, an empty file and a file over 5 MB", async () => {
    const { orders } = makeService();
    await expect(
      orders.uploadPhoto(new TextEncoder().encode("<svg/>")),
    ).rejects.toThrow(InvalidInput);
    await expect(orders.uploadPhoto(new Uint8Array())).rejects.toThrow(
      InvalidInput,
    );
    await expect(
      orders.uploadPhoto(new Uint8Array(5 * 1024 * 1024 + 1)),
    ).rejects.toThrow(TooLarge);
  });
});

describe("OrdersService: paying by bank transfer (SePay)", () => {
  const QR = {
    imageUrl: "https://qr.sepay.vn/img?x",
    bankName: "TPBank",
    accountNumber: "0123",
    accountName: "SHOP",
    amountVnd: 49000,
    content: "CODE",
  };
  function transfer(
    found: () => Promise<import("../../payments/provider").PaymentFound | null>,
  ) {
    let clock = FIXED_NOW.getTime();
    const findPayment = vi.fn(found);
    const provider = {
      id: "sepay" as const,
      start: async (o: { code: string }) => ({
        kind: "qr" as const,
        qr: { ...QR, content: o.code.replace(/-/g, "") },
        ref: o.code.replace(/-/g, ""),
      }),
      findPayment,
    };
    return {
      findPayment,
      tick: (ms: number) => {
        clock += ms;
      },
      over: { makeProvider: () => provider, now: () => new Date(clock) },
    };
  }

  it("hands back the QR code and remembers the transfer's code on the order", async () => {
    const t = transfer(async () => null);
    const { orders, repo, orderId, accessToken } = await bought(t.over);
    const r = await orders.startPayment(orderId, accessToken, ORIGIN);
    const order = (await repo.getOrder(orderId))!;
    expect(r).toEqual({ qr: { ...QR, content: order.code.replace(/-/g, "") } });
    expect(order).toMatchObject({
      status: "pending",
      paymentProvider: "sepay",
      paymentRef: order.code.replace(/-/g, ""),
    });
  });

  it("is paid once the money is found while the buyer waits, then shows the gift link", async () => {
    let money: import("../../payments/provider").PaymentFound | null = null;
    const t = transfer(async () => money);
    const { orders, repo, orderId, accessToken } = await bought(t.over);
    await orders.startPayment(orderId, accessToken, ORIGIN);
    expect(
      (await orders.getOrderView(orderId, accessToken, ORIGIN)).status,
    ).toBe("pending");
    money = {
      providerRef: "tx-9",
      amountVnd: 50000,
      paidAt: "2026-10-20T03:05:00.000Z",
      raw: { id: "tx-9" },
    };
    t.tick(5000);
    const view = await orders.getOrderView(orderId, accessToken, ORIGIN);
    expect(view).toMatchObject({
      status: "paid",
      paidAt: "2026-10-20T03:05:00.000Z",
    });
    expect(view.giftUrl).toMatch(/\/g\/[A-Za-z0-9]{10}$/);
    expect(repo.paymentsOf(orderId)).toMatchObject([
      { provider: "sepay", amountVnd: 49000 },
    ]);
  });

  it("asks SePay at most every few seconds per order, but at once when its webhook names the order", async () => {
    const t = transfer(async () => null);
    const { orders, repo, orderId, accessToken } = await bought(t.over);
    await orders.startPayment(orderId, accessToken, ORIGIN);
    await orders.getOrderView(orderId, accessToken, ORIGIN);
    await orders.getOrderView(orderId, accessToken, ORIGIN);
    expect(t.findPayment).toHaveBeenCalledTimes(1);
    t.tick(4000);
    await orders.getOrderView(orderId, accessToken, ORIGIN);
    expect(t.findPayment).toHaveBeenCalledTimes(2);
    const code = (await repo.getOrder(orderId))!.code;
    expect(await orders.notifyPayment(code)).toBe("pending");
    expect(t.findPayment).toHaveBeenCalledTimes(3);
    expect(await orders.notifyPayment("GC-000000-ZZZZZ")).toBeNull();
  });

  it("keeps waiting when SePay does not answer", async () => {
    const t = transfer(async () => {
      throw new Error("SePay /transactions answered 503");
    });
    const { orders, orderId, accessToken } = await bought(t.over);
    await orders.startPayment(orderId, accessToken, ORIGIN);
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      (await orders.getOrderView(orderId, accessToken, ORIGIN)).status,
    ).toBe("pending");
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("never asks for an order whose payment was not started with it", async () => {
    const t = transfer(async () => null);
    const { orders, orderId, accessToken } = await bought(t.over);
    await orders.getOrderView(orderId, accessToken, ORIGIN);
    expect(t.findPayment).not.toHaveBeenCalled();
  });
});
