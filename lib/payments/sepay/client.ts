/* SePay's user API (v2): the shop's bank accounts and the money that came into them. Bearer token auth
   (SEPAY_API_KEY, created at my.sepay.vn > Cấu hình công ty > API Access). The token never appears in a log or an
   error. Docs: https://developer.sepay.vn/vi/sepay-api/v2 */
import 'server-only';

export interface SepayBankAccount {
  id: string;
  account_number: string;
  account_holder_name: string;
  bank_short_name: string;
  bank_code?: string;
  bank_bin?: string;
  active?: string | number | boolean;
}

export interface SepayTransaction {
  id: string;
  transaction_date: string;
  account_number: string;
  transfer_type: 'in' | 'out';
  amount_in: number | string;
  transaction_content: string;
  reference_number?: string | null;
  code?: string | null;
  bank_account_id?: string | null;
}

export class SepayError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) { super(message); }
}

export interface SepayClientOptions {
  apiKey: string;
  /** https://userapi.sepay.vn/v2 (production) or https://userapi-sandbox.sepay.vn/v2 (sandbox, its own token) */
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export const SEPAY_PRODUCTION = 'https://userapi.sepay.vn/v2';

export class SepayClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly o: SepayClientOptions) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  private async get<T>(path: string, query: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(`${this.o.baseUrl.replace(/\/+$/, '')}${path}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        headers: { Authorization: `Bearer ${this.o.apiKey}`, Accept: 'application/json', 'User-Agent': 'BuuCucDem/1.0 (gift shop server)' },
        signal: AbortSignal.timeout(this.o.timeoutMs ?? 10_000),
        cache: 'no-store'
      });
    } catch (e) {
      throw new SepayError(`SePay ${path} did not answer (${e instanceof Error ? e.name : 'error'})`, 0);
    }
    const body = (await res.json().catch(() => null)) as { status?: string; data?: unknown; message?: string; error_code?: string } | null;
    if (!res.ok || !body || body.status !== 'success') {
      throw new SepayError(`SePay ${path} answered ${res.status}: ${body?.message ?? 'no message'}`, res.status, body?.error_code);
    }
    return body.data as T;
  }

  /** the company's bank accounts linked to SePay */
  bankAccounts(): Promise<SepayBankAccount[]> {
    return this.get<SepayBankAccount[]>('/bank-accounts');
  }

  /** money that came in: transfers whose message or code mentions `q`, of at least `minAmount`, since `fromDate` */
  incoming(q: { search: string; minAmount: number; fromDate: string; bankAccountId?: string }): Promise<SepayTransaction[]> {
    return this.get<SepayTransaction[]>('/transactions', {
      transfer_type: 'in', q: q.search, amount_in_min: q.minAmount, transaction_date_from: q.fromDate,
      bank_account_id: q.bankAccountId, per_page: 20, transaction_date_sort: 'desc', timestamp_format: 'iso8601'
    });
  }
}
