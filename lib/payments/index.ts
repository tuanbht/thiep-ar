/* Which provider takes payments, from PAYMENT_PROVIDER. A provider is made when a payment starts (or is checked), so a
   shop without one still lists and previews cards; paying then answers 503 with the reason in the server's log.
     test   pays at once (TestPaymentProvider): development and tests; production only with ALLOW_TEST_PAYMENTS=true
     sepay  a VietQR bank transfer, found through SePay's API (lib/payments/sepay) */
import 'server-only';
import { testPaymentsAllowed, type ServerEnv } from '../server/env';
import { PaymentUnavailable, type PaymentProvider } from './provider';
import { SepayClient } from './sepay/client';
import { SepayProvider } from './sepay/provider';
import { TestPaymentProvider, type Confirm } from './test-provider';

export type ProviderFactory = (confirm: Confirm) => PaymentProvider;

export function paymentProviderFactory(env: ServerEnv): ProviderFactory {
  if (env.PAYMENT_PROVIDER === 'sepay') {
    if (!env.SEPAY_API_KEY) return () => { throw new PaymentUnavailable('SePay is chosen but SEPAY_API_KEY is not set'); };
    const sepay = new SepayProvider(new SepayClient({ apiKey: env.SEPAY_API_KEY, baseUrl: env.SEPAY_API_URL }),
      { bankAccountId: env.SEPAY_BANK_ACCOUNT_ID, qrTemplate: env.SEPAY_QR_TEMPLATE });    // one, so its bank account lookup is kept
    return () => sepay;
  }
  if (!testPaymentsAllowed(env)) return () => { throw new PaymentUnavailable('test payments are off in production (ALLOW_TEST_PAYMENTS)'); };
  return confirm => new TestPaymentProvider(confirm);
}
