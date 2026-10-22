import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { GiftClient } from "@/components/shop/GiftClient";
import { S } from "@/components/shop/strings";
import { SLUG_RE } from "@/lib/orders/ids";
import { getServices } from "@/lib/server/services";

/* The gift: whoever has the link opens it (that is the product), but only once its order is paid. */
const findGift = cache(async (slug: string) => {
  if (!SLUG_RE.test(slug)) return null;
  return getServices().orders.getGift(slug);
});

const PRIVATE = { index: false, follow: false };
/** the size of a template's picture, public/thumbs/<template>.jpg */
const THUMB = { width: 960, height: 600 };

/* A gift link shared in a messenger previews as its card: the template's own picture and the card's title. The letter
   and the buyer's photos stay inside the gift. */
export async function generateMetadata({
  params,
}: PageProps<"/g/[slug]">): Promise<Metadata> {
  const gift = await findGift((await params).slug);
  if (!gift) return { robots: PRIVATE };
  const { card, product } = gift;
  const title = card.title || product.name;
  const images = card.template
    ? [{ url: `/thumbs/${card.template}.jpg`, ...THUMB, alt: product.name }]
    : undefined;
  return {
    title,
    description: S.gift.preview,
    robots: PRIVATE,
    openGraph: {
      type: "website",
      siteName: S.brand,
      title,
      description: S.gift.preview,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: S.gift.preview,
      images,
    },
  };
}

export default async function GiftPage({ params }: PageProps<"/g/[slug]">) {
  const { slug } = await params;
  const gift = await findGift(slug);
  if (!gift) notFound();
  return <GiftClient card={gift.card} productId={gift.product.id} />;
}
