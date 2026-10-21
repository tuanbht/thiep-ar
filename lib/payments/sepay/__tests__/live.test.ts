/* Against the real SePay API, read-only (it creates nothing and moves no money): SEPAY_LIVE=1 pnpm exec vitest run
   lib/payments/sepay/__tests__/live.test.ts. Uses SEPAY_API_KEY (and SEPAY_BANK_ACCOUNT_ID) from .env.local. */
import { describe, expect, it } from "vitest";
import type { Order } from "../../../domain/types";
import { SepayClient, SEPAY_PRODUCTION } from "../client";
import { SepayProvider } from "../provider";

const live = process.env.SEPAY_LIVE === "1" && !!process.env.SEPAY_API_KEY;

describe.skipIf(!live)("SePay, live and read-only", () => {
  const provider = new SepayProvider(
    new SepayClient({
      apiKey: process.env.SEPAY_API_KEY!,
      baseUrl: process.env.SEPAY_API_URL || SEPAY_PRODUCTION,
    }),
    { bankAccountId: process.env.SEPAY_BANK_ACCOUNT_ID || undefined },
  );
  const order: Order = {
    id: "live-check",
    code: "GC-000101-ZZZZZ",
    giftCardId: "g",
    productId: "p",
    amountVnd: 49000,
    status: "pending",
    buyer: { name: null, email: null, phone: null },
    accessTokenHash: "x",
    paymentProvider: "sepay",
    paymentRef: null,
    paidAt: null,
    createdAt: new Date().toISOString(),
  };

  it("reads the shop's bank account into a QR code, and finds no payment for an order nobody paid", async () => {
    const start = await provider.start(order);
    expect(start.kind).toBe("qr");
    if (start.kind !== "qr") return;
    expect(start.qr.accountNumber).toMatch(/^\d{6,20}$/);
    expect(start.qr.content).toBe("GC000101ZZZZZ");
    const img = await fetch(start.qr.imageUrl);
    expect(
      img.ok && img.headers.get("content-type")?.startsWith("image/"),
    ).toBe(true);
    expect(await provider.findPayment(order)).toBeNull();
  }, 30_000);
});
