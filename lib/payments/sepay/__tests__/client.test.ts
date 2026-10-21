import { describe, expect, it, vi } from "vitest";
import { SepayClient, SepayError } from "../client";

const ok = (data: unknown) =>
  new Response(JSON.stringify({ status: "success", data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

describe("SepayClient", () => {
  it("asks with the bearer token and the filters, and gives back the data", async () => {
    const fetch = vi.fn().mockResolvedValue(ok([{ id: "t1" }]));
    const c = new SepayClient({
      apiKey: "secret-token-1234567890",
      baseUrl: "https://userapi.sepay.vn/v2/",
      fetch,
    });
    expect(
      await c.incoming({
        search: "GC2610207K3QX",
        minAmount: 49000,
        fromDate: "2026-10-19",
        bankAccountId: "ba1",
      }),
    ).toEqual([{ id: "t1" }]);
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe(
      "https://userapi.sepay.vn/v2/transactions?transfer_type=in&q=GC2610207K3QX&amount_in_min=49000&transaction_date_from=2026-10-19&bank_account_id=ba1&per_page=20&transaction_date_sort=desc&timestamp_format=iso8601",
    );
    expect(init.headers.Authorization).toBe("Bearer secret-token-1234567890");
    expect(init.headers["User-Agent"]).toMatch(/BuuCucDem/);
  });

  it("turns an error answer into a SepayError that never shows the token", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "error",
          message: "Unauthorized Access",
          error_code: "unauthorized",
        }),
        { status: 401 },
      ),
    );
    const c = new SepayClient({
      apiKey: "secret-token-1234567890",
      baseUrl: "https://x",
      fetch,
    });
    const e = await c.bankAccounts().catch((err) => err);
    expect(e).toBeInstanceOf(SepayError);
    expect(e).toMatchObject({ status: 401, code: "unauthorized" });
    expect(String(e.message)).not.toContain("secret-token");
  });

  it("says when SePay does not answer at all", async () => {
    const c = new SepayClient({
      apiKey: "k".repeat(20),
      baseUrl: "https://x",
      fetch: vi.fn().mockRejectedValue(new TypeError("fetch failed")),
    });
    await expect(c.bankAccounts()).rejects.toMatchObject({ status: 0 });
  });
});
