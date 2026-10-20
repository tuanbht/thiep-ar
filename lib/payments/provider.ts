/* How a buyer pays. The checkout asks the configured provider to start a payment for an order; the provider either
   finishes it at once (the test provider, for development), sends the buyer to pay elsewhere, or hands back a QR code
   to pay by bank transfer (SePay). A provider that can be asked "has this order been paid?" (findPayment) is checked
   while the buyer waits and when its webhook arrives; OrdersService.confirmPayment then marks the order paid.
   PAYMENT_PROVIDER picks one; "test" is refused in production unless ALLOW_TEST_PAYMENTS=true. */
import type { PaymentQr } from '../api/dto';
import type { Order, PaymentProviderId, Product } from '../domain/types';

export type PaymentStart =
  /** paid already: show the order */
  | { kind: 'completed' }
  /** go and pay there; the provider confirms the order when it is paid */
  | { kind: 'redirect'; url: string }
  /** pay by transfer: show this QR code; `ref` is what matches the money to the order (the transfer's message) */
  | { kind: 'qr'; qr: PaymentQr; ref: string };

/** A payment the provider found for an order. */
export interface PaymentFound {
  /** the provider's own id for it (one payment pays one order) */
  providerRef: string;
  amountVnd: number;
  paidAt: string;
  /** what the provider said, kept with the payment */
  raw: unknown;
}

export interface PaymentContext {
  /** this site, e.g. https://thiep.example.com, for return and callback links */
  origin: string;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** the only hosts a redirect may go to (its gateway, over https); a provider that never redirects has none */
  readonly redirectHosts?: readonly string[];
  start(order: Order, product: Product, ctx: PaymentContext): Promise<PaymentStart>;
  /** asks the provider whether the order has been paid in full; null while it has not */
  findPayment?(order: Order): Promise<PaymentFound | null>;
}

export class PaymentUnavailable extends Error {}
