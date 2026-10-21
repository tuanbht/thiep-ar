import { describe, expect, it, vi } from "vitest";
import type { Order } from "../../../domain/types";
import { PaymentUnavailable } from "../../provider";
import type {
  SepayBankAccount,
  SepayClient,
  SepayTransaction,
} from "../client";
import { SepayProvider } from "../provider";

const TPB: SepayBankAccount = {
  id: "ba-tpb",
  account_number: "0123456789",
  account_holder_name: "BUI TUAN",
  bank_short_name: "TPBank",
  active: "1",
};
const order: Order = {
  id: "o1",
  code: "GC-261020-7K3QX",
  giftCardId: "g1",
  productId: "mochi",
  amountVnd: 49000,
  status: "pending",
  buyer: { name: null, email: null, phone: null },
  accessTokenHash: "x",
  paymentProvider: "sepay",
  paymentRef: "GC2610207K3QX",
  paidAt: null,
  createdAt: "2026-10-20T03:00:00.000Z",
};
const tx = (over: Partial<SepayTransaction> = {}): SepayTransaction => ({
  id: "tx-1",
  transaction_date: "2026-10-20T10:05:00+07:00",
  account_number: "0123456789",
  transfer_type: "in",
  amount_in: 49000,
  transaction_content: "NGUYEN VAN A GC2610207K3QX",
  code: null,
  bank_account_id: "ba-tpb",
  ...over,
});
const client = (accounts: SepayBankAccount[], txs: SepayTransaction[] = []) =>
  ({
    bankAccounts: vi.fn().mockResolvedValue(accounts),
    incoming: vi.fn().mockResolvedValue(txs),
  }) as unknown as SepayClient & {
    bankAccounts: ReturnType<typeof vi.fn>;
    incoming: ReturnType<typeof vi.fn>;
  };

describe("SepayProvider", () => {
  it("hands back a VietQR code for the shop's account, with the amount and the order's code", async () => {
    const start = await new SepayProvider(client([TPB])).start(order);
    expect(start).toMatchObject({
      kind: "qr",
      ref: "GC2610207K3QX",
      qr: {
        bankName: "TPBank",
        accountNumber: "0123456789",
        accountName: "BUI TUAN",
        amountVnd: 49000,
        content: "GC2610207K3QX",
      },
    });
    const url = new URL(start.kind === "qr" ? start.qr.imageUrl : "");
    expect(url.origin + url.pathname).toBe("https://qr.sepay.vn/img");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      acc: "0123456789",
      bank: "TPBank",
      amount: "49000",
      des: "GC2610207K3QX",
      template: "compact",
    });
  });

  it("takes the configured account, else the only active one, and looks it up once", async () => {
    const other = {
      ...TPB,
      id: "ba-mb",
      bank_short_name: "MBBank",
      account_number: "999",
    };
    const c = client([{ ...TPB, active: "0" }, other]);
    const p = new SepayProvider(c);
    expect(
      (await p.start(order)).kind === "qr" &&
        ((await p.start(order)) as { qr: { bankName: string } }).qr.bankName,
    ).toBe("MBBank");
    expect(c.bankAccounts).toHaveBeenCalledTimes(1);
    const chosen = await new SepayProvider(client([TPB, other]), {
      bankAccountId: "ba-tpb",
    }).start(order);
    expect(chosen.kind === "qr" && chosen.qr.bankName).toBe("TPBank");
    await expect(
      new SepayProvider(client([TPB]), { bankAccountId: "nope" }).start(order),
    ).rejects.toThrow(PaymentUnavailable);
    await expect(new SepayProvider(client([])).start(order)).rejects.toThrow(
      PaymentUnavailable,
    );
  });

  it("finds the money: into the account, carrying the code, at least the amount", async () => {
    const c = client([TPB], [tx()]);
    expect(await new SepayProvider(c).findPayment(order)).toEqual({
      providerRef: "tx-1",
      amountVnd: 49000,
      paidAt: "2026-10-20T03:05:00.000Z",
      raw: tx(),
    });
    expect(c.incoming).toHaveBeenCalledWith({
      search: "GC2610207K3QX",
      minAmount: 49000,
      fromDate: "2026-10-19",
      bankAccountId: "ba-tpb",
    });
  });

  it("ignores what is not this order's payment", async () => {
    for (const t of [
      tx({ amount_in: 20000 }),
      tx({ transaction_content: "GC2610207K3QY" }),
      tx({ transfer_type: "out" }),
    ])
      expect(
        await new SepayProvider(client([TPB], [t])).findPayment(order),
      ).toBeNull();
    expect(
      await new SepayProvider(
        client(
          [TPB],
          [tx({ transaction_content: "tien thiep", code: "GC2610207K3QX" })],
        ),
      ).findPayment(order),
    ).not.toBeNull(); // SePay's own code
  });
});
