/* /sitemap.xml: the shop's public pages for search engines: the shelf, the about page and every card on sale, each with
   its shop picture. Gift, order and checkout links are private and never listed. It is read when a crawler asks, since
   cards come and go with the database; if the database cannot be read, the shelf and the about page are still listed. */
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { siteOrigin } from "@/components/shop/origin";
import { getServices } from "@/lib/server/services";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // the cards on sale now, not those at build time
  const site = await siteOrigin();
  const pages: MetadataRoute.Sitemap = [
    { url: `${site}/`, changeFrequency: "daily", priority: 1 },
    { url: `${site}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];
  try {
    const products = await getServices().orders.listProducts();
    return [
      ...pages,
      ...products.map((p) => ({
        url: `${site}/cards/${encodeURIComponent(p.id)}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        images: [`${site}/thumbs/${encodeURIComponent(p.template)}.jpg`],
      })),
    ];
  } catch (e) {
    console.error("[sitemap] the cards could not be listed", e);
    return pages;
  }
}
