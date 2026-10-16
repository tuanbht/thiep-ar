/* How a buyer pays. The checkout asks the configured provider to start a payment for an order; the provider either
   finishes it at once (the test provider, for development) or sends the buyer to pay elsewhere and confirms later
   (ZaloPay: a redirect to its gateway, then a signed callback that calls OrdersService.confirmPayment).
   PAYMENT_PROVIDER picks one; "test" is refused in production unless ALLOW_TEST_PAYMENTS=true. */
import type { Order, PaymentProviderId, Product } from '../domain/types';

export type PaymentStart =
  /** paid already: show the order */
  | { kind: 'completed' }
  /** go and pay there; the provider confirms the order when it is paid */
  | { kind: 'redirect'; url: string };

export interface PaymentContext {
  /** this site, e.g. https://thiep.example.com, for return and callback links */
  origin: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** the only hosts a redirect may go to (its gateway, over https); a provider that never redirects has none */
  readonly redirectHosts?: readonly string[];
  start(order: Order, product: Product, ctx: PaymentContext): Promise<PaymentStart>;
}

export class PaymentUnavailable extends Error {}
