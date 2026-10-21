/* The buy workflow, apart from HTTP: a buyer's card becomes a draft gift and a pending order; paying it (through the
   configured provider) activates the gift; its link opens it. Every route and page goes through here.
   Dependencies come in (repository, photo store, template catalog, payment provider factory, clock, randomness), so
   tests run it on memory with a fixed clock. */
import type { z } from "zod";
import type {
  createOrderRequestSchema,
  CreateOrderResponse,
  OrderView,
  PayResponse,
  UploadResponse,
} from "../api/dto";
import { LIMITS } from "../api/dto";
import type { TemplateInfo } from "../catalog/templates";
import { validateContent } from "../content/validate";
import { toCard } from "../content/toCard";
import {
  StateError,
  UniqueViolation,
  type ConfirmedPayment,
  type PaymentConfirmation,
  type Repository,
} from "../db/repository";
import type {
  AnalyticsEvent,
  GiftCard,
  Order,
  Product,
  ProductFilter,
  ShelfCategory,
} from "../domain/types";
import type { PaymentProvider } from "../payments/provider";
import type { Card } from "../player/core/card";
import { randomToken, safeEqualHex, sha256Hex } from "../server/security";
import { AccessDenied, InvalidInput, NotFound, TooLarge } from "./errors";
import {
  makeOrderCode,
  makeSlug,
  ORDER_ID_RE,
  SLUG_RE,
  type RandomBytes,
} from "./ids";
import { sniffPhoto, type PhotoCleaner, type PhotoStore } from "./photo";

export type CreateOrderInput = z.output<typeof createOrderRequestSchema>;

export interface OrdersDeps {
  repo: Repository;
  photos: PhotoStore;
  /** re-encodes uploads (lib/server/photo-clean.ts); tests may leave it out */
  cleanPhoto?: PhotoCleaner;
  templates: (id: string) => Promise<TemplateInfo | null>;
  /** makes the payment provider when a payment starts; `confirm` is this service's confirmPayment */
  makeProvider: (
    confirm: (c: PaymentConfirmation) => Promise<ConfirmedPayment>,
  ) => PaymentProvider;
  /** the site's public address for gift links (NEXT_PUBLIC_SITE_URL); else the request's origin */
  siteUrl?: string;
  now?: () => Date;
  random?: RandomBytes;
}

/** How long a photo link lasts: long enough to watch the card through, short enough not to be a permanent link. */
const PHOTO_LINK_SECONDS = 60 * 60;
const ATTEMPTS = 5;
/** how often a waiting order may ask its provider whether it has been paid (the buyer's page polls every few seconds) */
const CHECK_EVERY_MS = 4000;

export class OrdersService {
  private readonly now: () => Date;
  private readonly lastCheck = new Map<string, number>();

  constructor(private readonly d: OrdersDeps) {
    this.now = d.now ?? (() => new Date());
  }

  /** the shelf: what is on sale, matching the words typed and the category picked, if any */
  listProducts(filter?: ProductFilter): Promise<Product[]> {
    return this.d.repo.listProducts(filter);
  }

  listCategories(): Promise<ShelfCategory[]> {
    return this.d.repo.listCategories();
  }

  getProduct(id: string): Promise<Product | null> {
    return this.d.repo.getProduct(id);
  }

  /* ── buying ── */

  async createOrder(
    req: CreateOrderInput,
    origin: string,
  ): Promise<{ response: CreateOrderResponse; accessToken: string }> {
    const product = await this.d.repo.getProduct(req.productId);
    if (!product || !product.active)
      throw new NotFound("Mẫu thiệp này không còn bán.");
    const info = await this.d.templates(product.template);
    if (!info) {
      console.error(
        `[orders] product ${product.id} names template ${product.template}, which has no template.json`,
      );
      throw new NotFound("Mẫu thiệp này không còn bán.");
    }
    const content = validateContent(req.content, info.form);
    if (
      (
        await Promise.all(
          content.photoPaths.map((p) => this.d.photos.exists(p)),
        )
      ).some((kept) => !kept)
    )
      throw new InvalidInput([
        "Có ảnh đã tải lên không còn nữa. Vui lòng chọn lại ảnh đó.",
      ]);

    const gift = await this.retry("slug", () =>
      this.d.repo.createGiftCard({
        slug: makeSlug(this.d.random),
        productId: product.id,
        template: product.template,
        design: product.design,
        content,
      }),
    );
    const accessToken = randomToken();
    const order = await this.retry("order code", () =>
      this.d.repo.createOrder({
        code: makeOrderCode(this.now(), this.d.random),
        giftCardId: gift.id,
        productId: product.id,
        amountVnd: product.priceVnd,
        buyer: req.buyer,
        accessTokenHash: sha256Hex(accessToken),
      }),
    );
    await this.recordEvent({
      name: "order_created",
      orderId: order.id,
      giftCardId: gift.id,
      productId: product.id,
      props: { amountVnd: order.amountVnd, origin: safeOrigin(origin) },
    });
    return {
      response: {
        orderId: order.id,
        code: order.code,
        checkoutUrl: `/checkout/${order.id}`,
      },
      accessToken,
    };
  }

  /** a unique value (slug, code) clashing is rare but possible: draw again a few times */
  private async retry<T>(what: string, make: () => Promise<T>): Promise<T> {
    for (let i = 1; ; i++) {
      try {
        return await make();
      } catch (e) {
        if (!(e instanceof UniqueViolation) || i >= ATTEMPTS) throw e; // only a clash of random names is worth a retry
        console.warn(`[orders] ${what} clashed (try ${i}): ${e.message}`);
      }
    }
  }

  /** the order, for the browser that made it */
  private async ownOrder(
    orderId: string,
    accessToken: string | null,
  ): Promise<Order> {
    if (!ORDER_ID_RE.test(orderId))
      throw new NotFound("Không tìm thấy đơn hàng.");
    const order = await this.d.repo.getOrder(orderId);
    if (!order) throw new NotFound("Không tìm thấy đơn hàng.");
    if (
      !accessToken ||
      !safeEqualHex(sha256Hex(accessToken), order.accessTokenHash)
    )
      throw new AccessDenied();
    return order;
  }

  async getOrderView(
    orderId: string,
    accessToken: string | null,
    origin: string,
  ): Promise<OrderView> {
    const order = await this.settle(await this.ownOrder(orderId, accessToken));
    const [product, gift] = await Promise.all([
      this.d.repo.getProduct(order.productId),
      this.d.repo.getGiftCard(order.giftCardId),
    ]);
    const giftUrl =
      order.status === "paid" && gift?.status === "active"
        ? this.giftUrl(gift, origin)
        : null;
    return {
      id: order.id,
      code: order.code,
      status: order.status,
      amountVnd: order.amountVnd,
      product: {
        id: order.productId,
        name: product?.name ?? order.productId,
        template: product?.template ?? gift?.template ?? "",
      },
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      giftUrl,
    };
  }

  private giftUrl(gift: GiftCard, origin: string): string {
    return new URL(`/g/${gift.slug}`, this.d.siteUrl ?? origin).toString();
  }

  /** "Pay": the provider either pays at once (test), hands back a QR code to pay by transfer (SePay), or redirects */
  async startPayment(
    orderId: string,
    accessToken: string | null,
    origin: string,
  ): Promise<PayResponse> {
    const order = await this.ownOrder(orderId, accessToken);
    const done = { redirect: `/orders/${order.id}` };
    if (order.status === "paid") return done; // pressed twice, or came back: nothing to pay
    if (order.status !== "pending")
      throw new StateError(`order ${order.code} is ${order.status}`);
    const product = await this.d.repo.getProduct(order.productId);
    if (!product) throw new NotFound("Mẫu thiệp này không còn bán.");
    const provider = this.d.makeProvider((c) => this.confirmPayment(c)); // PaymentUnavailable when none is configured
    await this.recordEvent({
      name: "payment_started",
      orderId: order.id,
      productId: product.id,
      giftCardId: order.giftCardId,
      props: { provider: provider.id },
    });
    const start = await provider.start(order, product, {
      origin: this.d.siteUrl ?? origin,
    });
    if (start.kind === "qr") {
      if (
        order.paymentProvider !== provider.id ||
        order.paymentRef !== start.ref
      )
        await this.d.repo.setOrderPayment(order.id, provider.id, start.ref);
      return { qr: start.qr };
    }
    if (start.kind !== "redirect") return done;
    if (!isGatewayUrl(start.url, provider.redirectHosts ?? []))
      throw new Error(
        `provider ${provider.id} redirected to a host it does not own`,
      );
    return { redirect: start.url };
  }

  /* ── waiting for the money ── */

  /** A pending order whose payment was started with a provider that can be asked: has it been paid? If so it is
      confirmed now. At most every CHECK_EVERY_MS per order unless `force` (a webhook); a provider that does not answer
      leaves the order as it is (the next look tries again). */
  private async settle(order: Order, force = false): Promise<Order> {
    if (
      order.status !== "pending" ||
      !order.paymentProvider ||
      order.paymentProvider === "test"
    )
      return order;
    const at = this.now().getTime();
    if (!force && at - (this.lastCheck.get(order.id) ?? 0) < CHECK_EVERY_MS)
      return order;
    this.lastCheck.set(order.id, at);
    let provider: PaymentProvider;
    try {
      provider = this.d.makeProvider((c) => this.confirmPayment(c));
    } catch {
      return order;
    }
    if (provider.id !== order.paymentProvider || !provider.findPayment)
      return order;
    try {
      const found = await provider.findPayment(order);
      if (!found) return order;
      const r = await this.confirmPayment({
        orderId: order.id,
        provider: provider.id,
        providerRef: found.providerRef,
        amountVnd: order.amountVnd,
        raw: { ...(found.raw as object), receivedVnd: found.amountVnd },
        paidAt: found.paidAt,
      });
      this.lastCheck.delete(order.id);
      return r.order;
    } catch (e) {
      console.error(
        `[orders] could not check the payment of order ${order.code}`,
        e,
      );
      return order;
    }
  }

  /** A provider's webhook named this order: look for its payment now. Unknown codes are ignored. */
  async notifyPayment(orderCode: string): Promise<Order["status"] | null> {
    const order = await this.d.repo.getOrderByCode(orderCode);
    if (!order) return null;
    return (await this.settle(order, true)).status;
  }

  /** the only way an order becomes paid (the test provider at once; SePay when its money is found) */
  async confirmPayment(c: PaymentConfirmation): Promise<ConfirmedPayment> {
    const r = await this.d.repo.confirmPayment(c);
    if (!r.alreadyPaid) {
      await this.recordEvent({
        name: "order_paid",
        orderId: r.order.id,
        giftCardId: r.giftCard.id,
        productId: r.order.productId,
        props: { provider: c.provider, amountVnd: c.amountVnd },
      });
    }
    return r;
  }

  /* ── the gift ── */

  /** an active gift by its link, as the player's card (each photo as a link valid for an hour, one that cannot be signed
      left out); null otherwise */
  async getGift(
    slug: string,
  ): Promise<{ giftCard: GiftCard; product: Product; card: Card } | null> {
    if (!SLUG_RE.test(slug)) return null;
    const giftCard = await this.d.repo.getGiftCardBySlug(slug);
    if (!giftCard || giftCard.status !== "active") return null;
    const product = await this.d.repo.getProduct(giftCard.productId);
    if (!product) {
      console.error(
        `[orders] gift ${giftCard.id} names product ${giftCard.productId}, which is gone`,
      );
      return null;
    }
    const [info, links] = await Promise.all([
      // the template's theme, so the page opens in it; without it the player finds it when the act loads
      this.d.templates(giftCard.template).catch((e: unknown) => {
        console.error(
          `[orders] the template of gift ${giftCard.id} could not be read`,
          e,
        );
        return null;
      }),
      Promise.all(
        giftCard.content.photoPaths.map(async (p) => {
          try {
            return await this.d.photos.signedUrl(p, PHOTO_LINK_SECONDS);
          } catch (e) {
            console.error(
              `[orders] a photo of gift ${giftCard.id} could not be signed`,
              e,
            );
            return null;
          }
        }),
      ),
    ]);
    return {
      giftCard,
      product,
      card: toCard(
        giftCard.content,
        {
          template: giftCard.template,
          design: giftCard.design,
          theme: info?.theme ?? null,
        },
        links.filter((l): l is string => !!l),
      ),
    };
  }

  /** the id of an active or draft gift by its link, for events; null for anything else */
  async giftIdBySlug(slug: string): Promise<string | null> {
    if (!SLUG_RE.test(slug)) return null;
    return (await this.d.repo.getGiftCardBySlug(slug))?.id ?? null;
  }

  /* ── photos ── */

  async uploadPhoto(bytes: Uint8Array): Promise<UploadResponse> {
    if (bytes.byteLength > LIMITS.photoBytes)
      throw new TooLarge(`Ảnh tối đa ${LIMITS.photoBytes / 1024 / 1024} MB.`);
    if (!bytes.byteLength)
      throw new InvalidInput(["Chưa có ảnh nào được gửi."]);
    const sniffed = sniffPhoto(bytes);
    if (!sniffed) throw new InvalidInput(["Chỉ nhận ảnh JPG, PNG hoặc WebP."]);
    let photo = { bytes, ext: sniffed };
    if (this.d.cleanPhoto) {
      try {
        photo = await this.d.cleanPhoto(bytes, sniffed);
      } catch (e) {
        console.warn("[orders] an upload is not a readable image", e);
        throw new InvalidInput(["Ảnh này không đọc được. Hãy thử ảnh khác."]);
      }
    }
    const { ext } = photo;
    const photoPath = await this.d.photos.uploadDraftPhoto(photo.bytes, ext);
    const previewUrl = await this.d.photos.signedUrl(
      photoPath,
      PHOTO_LINK_SECONDS,
    );
    await this.recordEvent({
      name: "photo_uploaded",
      props: { ext, bytes: photo.bytes.byteLength },
    });
    return { photoPath, previewUrl };
  }

  /* ── stats ── */

  /** keeps an event; a failure is logged, never passed on (a lost event must not break a purchase) */
  async recordEvent(e: AnalyticsEvent): Promise<void> {
    try {
      await this.d.repo.recordEvent(e);
    } catch (err) {
      console.error(`[orders] event ${e.name} was not recorded`, err);
    }
  }
}

const safeOrigin = (o: string) => {
  try {
    return new URL(o).origin;
  } catch {
    return null;
  }
};

/** A gateway link the buyer may be sent to: https, on one of the provider's own hosts (never wherever a response said). */
export function isGatewayUrl(url: string, hosts: readonly string[]): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && hosts.includes(u.hostname);
  } catch {
    return false;
  }
}
