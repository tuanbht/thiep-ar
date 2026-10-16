import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { OrderView } from '@/lib/api/dto';
import { AccessDenied, NotFound } from '@/lib/orders/errors';
import { readOrderToken } from '@/lib/server/order-cookie';
import { getServices } from '@/lib/server/services';
import { siteOrigin } from './origin';
import { S } from './strings';

/* An order seen by the browser that placed it (its cookie holds the order's token); anyone else gets a polite no. */
export async function OrderGate({ orderId, children }: { orderId: string; children: (view: OrderView) => ReactNode }) {
  let view: OrderView;
  try {
    const token = await readOrderToken(orderId);
    view = await getServices().orders.getOrderView(orderId, token, await siteOrigin());
  } catch (e) {
    if (e instanceof NotFound) notFound();
    if (e instanceof AccessDenied) return <Denied />;
    throw e;
  }
  return <>{children(view)}</>;
}

function Denied() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="sign text-xs text-gold">{S.order.eyebrow}</p>
      <h1 className="mt-4 font-sign text-4xl font-extrabold uppercase leading-none">{S.access.title}</h1>
      <p className="mt-5 text-lg italic text-paper/75">{S.access.body}</p>
      <Link href="/" className="sign mt-8 inline-block rounded-full border-2 border-paper/60 px-6 py-3 text-xs text-paper transition-colors hover:border-gold hover:text-gold">{S.access.home}</Link>
    </section>
  );
}
