import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { GiftClient } from "@/components/shop/GiftClient";
import { SLUG_RE } from "@/lib/orders/ids";
import { getServices } from "@/lib/server/services";

/* The gift: whoever has the link opens it (that is the product), but only once its order is paid. */
const findGift = cache(async (slug: string) => {
  if (!SLUG_RE.test(slug)) return null;
  return getServices().orders.getGift(slug);
});

export async function generateMetadata({
  params,
}: PageProps<"/g/[slug]">): Promise<Metadata> {
  const gift = await findGift((await params).slug);
  return {
    title: gift?.card.title ?? undefined,
    robots: { index: false, follow: false },
  };
}

export default async function GiftPage({ params }: PageProps<"/g/[slug]">) {
  const { slug } = await params;
  const gift = await findGift(slug);
  if (!gift) notFound();
  const h = await headers();
  const userAgent = h.get("user-agent"),
    referrer = h.get("referer");
  after(async () => {
    try {
      await getServices().orders.recordEvent({
        name: "gift_open",
        giftCardId: gift.giftCard.id,
        productId: gift.product.id,
        userAgent,
        referrer,
      });
    } catch (e) {
      console.error("[gift] gift_open was not recorded", e);
    }
  });
  return <GiftClient card={gift.card} slug={slug} />;
}
