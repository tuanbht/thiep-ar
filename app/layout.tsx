import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Dancing_Script, Lora } from "next/font/google";
import { S } from "@/components/shop/strings";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const barlow = Barlow_Condensed({
  weight: ["500", "700", "800"],
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-barlow",
  display: "swap",
});
const lora = Lora({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-lora",
  display: "swap",
});
const dancing = Dancing_Script({
  weight: ["700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-dancing",
  display: "swap",
});

/** where the shop lives: a link preview's picture needs a whole address (without it, Next falls back to localhost) */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: siteUrl && URL.canParse(siteUrl) ? new URL(siteUrl) : undefined,
  title: {
    default: `${S.brandSub} · ${S.brand}`,
    template: `%s · ${S.brandSub}`,
  },
  description: S.home.lead,
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1030",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${barlow.variable} ${lora.variable} ${dancing.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Analytics />
        <SpeedInsights />
        {children}
      </body>
    </html>
  );
}
