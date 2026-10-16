/* Which provider takes payments, from PAYMENT_PROVIDER. A provider is made when a payment starts, so a shop without
   one still lists and previews cards; paying then answers 503 with the reason in the server's log.
     test     pays at once (TestPaymentProvider): development and tests; production only with ALLOW_TEST_PAYMENTS=true
     zalopay  not yet: its keys come later (lib/payments/zalopay.ts will plug in here) */
import 'server-only';
import { testPaymentsAllowed, type ServerEnv } from '../server/env';
import { PaymentUnavailable, type PaymentProvider } from './provider';
import { TestPaymentProvider, type Confirm } from './test-provider';

export type ProviderFactory = (confirm: Confirm) => PaymentProvider;

export function paymentProviderFactory(env: ServerEnv): ProviderFactory {
  if (env.PAYMENT_PROVIDER === 'zalopay') return () => { throw new PaymentUnavailable('ZaloPay is not configured yet'); };
  if (!testPaymentsAllowed(env)) return () => { throw new PaymentUnavailable('test payments are off in production (ALLOW_TEST_PAYMENTS)'); };
  return confirm => new TestPaymentProvider(confirm);
}
