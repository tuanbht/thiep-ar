import type { NextConfig } from "next";

/* Headers on every response. No page may be framed (a hidden "Pay" button under another site's page), nothing is
   sniffed into another type, links to other sites carry only our origin, and only this site may ask for the camera
   (the gift page) and the motion sensors (pinning a 3D act). A script CSP with nonces is the next step: it must be
   tried against MindAR's blob workers and three.js before it is switched on. */
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(), geolocation=(), payment=(), accelerometer=(self), gyroscope=(self), magnetometer=(self)",
  },
];

/* Crawlers that read only the HTML: a page's metadata (a gift link's picture and title) goes in its <head> for them,
   not streamed in after it as for browsers. Next's own list (next/dist/shared/lib/router/utils/html-bots), plus the
   messengers gift links are shared in here that it lacks, Zalo above all. */
const LINK_PREVIEW_BOTS = new RegExp(
  [
    "[\\w-]+-Google",
    "Google-[\\w-]+",
    "Chrome-Lighthouse",
    "Slurp",
    "DuckDuckBot",
    "baiduspider",
    "yandex",
    "sogou",
    "bitlybot",
    "tumblr",
    "vkShare",
    "quora link preview",
    "redditbot",
    "ia_archiver",
    "Bingbot",
    "BingPreview",
    "applebot",
    "facebookexternalhit",
    "facebookcatalog",
    "Twitterbot",
    "LinkedInBot",
    "Slackbot",
    "Discordbot",
    "WhatsApp",
    "SkypeUriPreview",
    "Yeti",
    "googleweblight",
    "Zalo",
    "TelegramBot",
    "Viber",
    "\\bLine\\/",
    "kakaotalk-scrap",
    "Pinterestbot",
    "Embedly",
    "iframely",
    "MicrosoftPreview",
  ].join("|"),
  "i",
);

const nextConfig: NextConfig = {
  cacheComponents: true,
  htmlLimitedBots: LINK_PREVIEW_BOTS,
  partialPrefetching: true,
  poweredByHeader: false,
  // the server reads each template's template.json and form.json from disk (lib/catalog/templates.ts): ship them with
  // every server function, since a host may serve public/ from a CDN only
  outputFileTracingIncludes: {
    "/**": [
      "./public/templates/*/template.json",
      "./public/templates/*/form.json",
    ],
  },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
