/* SePay as a payment provider: the buyer scans a VietQR code for the shop's bank account, with the amount and the
   order's payment code as the message; the order is paid once SePay sees that money arrive. Works with any account
   linked to SePay, personal ones included (SePay's per-order VA API needs a business account at BIDV, VCB, VietinBank,
   Shinhan or Sacombank). The money is found by asking SePay's transaction list, never by trusting a webhook's body. */
import 'server-only';
import type { Order } from '../../domain/types';
import type { PaymentFound, PaymentProvider, PaymentStart } from '../provider';
import { PaymentUnavailable } from '../provider';
import { carriesCode, paymentCode } from './code';
import type { SepayBankAccount, SepayClient } from './client';

export interface SepayProviderOptions {
  /** which linked account takes the money (its SePay id); the only active one when not set */
  bankAccountId?: string;
  /** qr.sepay.vn's template: compact (QR with the bank's logo) or qronly */
  qrTemplate?: string;
  now?: () => Date;
}

const ACCOUNT_TTL_MS = 10 * 60_000;
const DAY_MS = 24 * 3600_000;

/** a date in Vietnam time, as SePay's transaction filters take it */
const vnDay = (d: Date): string => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10);

export class SepayProvider implements PaymentProvider {
  readonly id = 'sepay' as const;
  private account: { at: number; value: Promise<SepayBankAccount> } | null = null;
  private readonly now: () => Date;

  constructor(private readonly client: SepayClient, private readonly o: SepayProviderOptions = {}) {
    this.now = o.now ?? (() => new Date());
  }

  /** the account the money goes to (read from SePay, kept ten minutes) */
  private bankAccount(): Promise<SepayBankAccount> {
    if (this.account && this.now().getTime() - this.account.at < ACCOUNT_TTL_MS) return this.account.value;
    const value = this.client.bankAccounts().then(list => {
      const active = list.filter(a => a.active === undefined || a.active === true || a.active === 1 || a.active === '1');
      const pick = this.o.bankAccountId ? list.find(a => a.id === this.o.bankAccountId) : active[0];
      if (!pick) throw new PaymentUnavailable(this.o.bankAccountId ? 'SEPAY_BANK_ACCOUNT_ID is not one of the SePay accounts' : 'no active bank account on SePay');
      if (!this.o.bankAccountId && active.length > 1) console.warn('[sepay] several active bank accounts; using the first (set SEPAY_BANK_ACCOUNT_ID to choose)');
      return pick;
    });
    value.catch(() => { this.account = null; });                    // a failed lookup is tried again next time
    this.account = { at: this.now().getTime(), value };
    return value;
  }

  async start(order: Order): Promise<PaymentStart> {
    const a = await this.bankAccount();
    const code = paymentCode(order.code);
    const qr = new URL('https://qr.sepay.vn/img');
    qr.search = new URLSearchParams({ acc: a.account_number, bank: a.bank_short_name, amount: String(order.amountVnd), des: code,
      template: this.o.qrTemplate ?? 'compact' }).toString();
    return {
      kind: 'qr',
      ref: code,
      qr: { imageUrl: qr.toString(), bankName: a.bank_short_name, accountNumber: a.account_number, accountName: a.account_holder_name,
        amountVnd: order.amountVnd, content: code }
    };
  }

  /** a transfer into the shop's account carrying the order's code, of at least its amount, since the order was made */
  async findPayment(order: Order): Promise<PaymentFound | null> {
    const a = await this.bankAccount();
    const code = paymentCode(order.code);
    const since = new Date(Date.parse(order.createdAt) - DAY_MS);
    const found = await this.client.incoming({ search: code, minAmount: order.amountVnd, fromDate: vnDay(since), bankAccountId: a.id });
    const tx = found.find(t => t.transfer_type === 'in' && Number(t.amount_in) >= order.amountVnd
      && carriesCode(`${t.transaction_content ?? ''} ${t.code ?? ''}`, code));
    if (!tx) return null;
    const at = Date.parse(tx.transaction_date);
    return { providerRef: String(tx.id), amountVnd: Number(tx.amount_in), paidAt: new Date(Number.isNaN(at) ? this.now().getTime() : at).toISOString(), raw: tx };
  }
}
