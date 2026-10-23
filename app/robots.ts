/* /robots.txt: crawlers may read every page but the API, and here is the sitemap. Gift links stay open on purpose:
   some messengers' link-preview bots obey this file, and the gift, order and checkout pages keep themselves out of
   search results with their own noindex. */
import type { MetadataRoute } from "next";
import { siteOrigin } from "@/components/shop/origin";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${await siteOrigin()}/sitemap.xml`,
  };
}
