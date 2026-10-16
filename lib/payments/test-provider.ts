/* The test provider: the order is paid the moment the buyer presses "Pay", through the same confirmPayment a real
   provider's callback uses, so the rest of the flow (the gift link, the stats) runs exactly as it will with ZaloPay.
   Development, tests and demo sites only (see lib/payments/index.ts). */
import type { ConfirmedPayment, PaymentConfirmation } from '../db/repository';
import type { Order, Product } from '../domain/types';
import type { PaymentProvider, PaymentStart } from './provider';

export type Confirm = (c: PaymentConfirmation) => Promise<ConfirmedPayment>;

export class TestPaymentProvider implements PaymentProvider {
  readonly id = 'test' as const;

  constructor(private readonly confirm: Confirm, private readonly now: () => Date = () => new Date()) {}

  async start(order: Order, product: Product): Promise<PaymentStart> {
    await this.confirm({
      orderId: order.id,
      provider: 'test',
      providerRef: `test_${order.code}`,
      amountVnd: order.amountVnd,
      raw: { simulated: true, product: product.id, code: order.code },
      paidAt: this.now().toISOString()
    });
    return { kind: 'completed' };
  }
}
