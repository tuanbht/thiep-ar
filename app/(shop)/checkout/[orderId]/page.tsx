import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { formatVnd } from "@/components/shop/format";
import { Postmark } from "@/components/shop/motifs";
import { OrderGate } from "@/components/shop/OrderGate";
import { PayButton } from "@/components/shop/PayButton";
import { S } from "@/components/shop/strings";
import { ContactNote } from "@/components/shop/ContactNote";
import { serverEnv } from "@/lib/server/env";

export const metadata: Metadata = {
  title: S.checkout.title,
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  params,
}: PageProps<"/checkout/[orderId]">) {
  const { orderId } = await params;
  const autoPay = serverEnv().PAYMENT_PROVIDER === "sepay"; // SePay: the QR code is the checkout, shown at once

  return (
    <OrderGate orderId={orderId}>
      {(view) => (
        <section className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-8">
          <p className="sign text-xs text-gold">
            {S.checkout.eyebrow} · {view.code}
          </p>
          <h1 className="mt-3 font-sign text-display font-extrabold uppercase leading-[1]">
            {S.checkout.title}
          </h1>

          <div className="grain relative mt-10 bg-paper px-6 py-8 text-ink shadow-[var(--shadow-lift)] sm:px-10">
            <div
              className="airmail absolute inset-x-0 top-0 h-1.5"
              aria-hidden="true"
            />
            <Postmark
              top="BƯU CỤC ĐÊM"
              bottom={view.code}
              middle="✓"
              className="absolute -right-4 -top-8 w-40 rotate-[14deg] text-post/70 sm:w-48"
            />
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-[auto_minmax(0,1fr)]">
              <dt className="sign text-[0.7rem] text-ink-2">
                {S.checkout.code}
              </dt>
              <dd className="font-sign text-xl font-bold tracking-wide">
                {view.code}
              </dd>
              <dt className="sign text-[0.7rem] text-ink-2">
                {S.checkout.card}
              </dt>
              <dd className="flex items-center gap-4">
                <div className="stamp w-28 shrink-0 bg-paper-2">
                  <Image
                    src={`/thumbs/${view.product.template}.jpg`}
                    alt=""
                    width={960}
                    height={600}
                    sizes="7rem"
                    className="aspect-[16/10] h-auto w-full object-cover"
                  />
                </div>
                <span className="font-sign text-2xl font-extrabold uppercase">
                  {view.product.name}
                </span>
              </dd>
              <dt className="sign text-[0.7rem] text-ink-2">
                {S.checkout.amount}
              </dt>
              <dd className="font-sign text-4xl font-extrabold tabular-nums text-post">
                {formatVnd(view.amountVnd)}
              </dd>
            </dl>

            <div className="mt-8 border-t-2 border-dashed border-ink/20 pt-6">
              {view.status === "paid" ? (
                <p className="text-lg italic">
                  {S.checkout.alreadyPaid}{" "}
                  <Link
                    href={`/orders/${view.id}`}
                    className="font-medium text-post underline underline-offset-4"
                  >
                    {S.checkout.seeOrder}
                  </Link>
                </p>
              ) : (
                <PayButton
                  orderId={view.id}
                  productId={view.product.id}
                  auto={autoPay}
                />
              )}
            </div>
          </div>

          <Link
            href={`/cards/${view.product.id}`}
            className="sign mt-8 inline-flex items-center gap-2 text-xs text-paper/70 transition-colors hover:text-gold"
          >
            <span aria-hidden="true">←</span> {S.checkout.edit}
          </Link>
          <ContactNote code={view.code} />
        </section>
      )}
    </OrderGate>
  );
}
