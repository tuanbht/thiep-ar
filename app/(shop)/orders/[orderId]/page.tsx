import type { Metadata } from "next";
import { ContactNote } from "@/components/shop/ContactNote";
import { OrderGate } from "@/components/shop/OrderGate";
import { OrderStatus } from "@/components/shop/OrderStatus";
import { S } from "@/components/shop/strings";

export const metadata: Metadata = {
  title: S.order.eyebrow,
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
}: PageProps<"/orders/[orderId]">) {
  const { orderId } = await params;
  return (
    <OrderGate orderId={orderId}>
      {(view) => (
        <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-8">
          <p className="sign text-xs text-gold">
            {S.order.eyebrow} · {view.code}
          </p>
          <h1 className="mt-3 font-sign text-display font-extrabold uppercase leading-[1]">
            {view.product.name}
          </h1>
          <OrderStatus initial={view} />
          <ContactNote code={view.code} />
        </section>
      )}
    </OrderGate>
  );
}
