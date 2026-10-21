import { SiteFooter } from "@/components/shop/SiteFooter";
import { SiteHeader } from "@/components/shop/SiteHeader";
import { S } from "@/components/shop/strings";

/* The shop's pages: the counter's header and footer around them. The gift page (/g/<slug>) has none: it is the card. */
export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sign sr-only z-50 bg-gold px-4 py-2 text-xs text-night focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {S.skip}
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
