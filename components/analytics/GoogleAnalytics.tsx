"use client";
/* Google Analytics 4 on every page (the root layout), when NEXT_PUBLIC_GA_ID is set: gtag.js once the page is
   interactive, and a page view for each address the visitor reaches, sent by lib/analytics/ga.ts with its private
   parts cut out. In GA turn off Enhanced measurement > Page views > "Page changes based on browser history events":
   gtag would count each navigation a second time, with its whole address. */
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { gaId, isPrivatePath, pageView } from "@/lib/analytics/ga";

/** how long a client navigation may take to stream its page's title in before the view is counted without it */
const TITLE_WAIT_MS = 1500;

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const href = window.location.href;
    let sent = false;
    const send = (title: string) => {
      if (sent) return;
      sent = true;
      pageView(href, title);
    };
    if (document.title || isPrivatePath(pathname)) {
      send(document.title);
      return;
    }
    // after a client navigation the title streams in a moment later than the address: wait for it, not long
    const watch = new MutationObserver(() => {
      if (document.title) send(document.title);
    });
    watch.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    const timer = window.setTimeout(() => send(document.title), TITLE_WAIT_MS);
    return () => {
      watch.disconnect();
      window.clearTimeout(timer);
      send(""); // gone before its title came: still a view, untitled (the next page's title would be wrong)
    };
  }, [pathname, search]);
  return null;
}

export function GoogleAnalytics() {
  const id = gaId();
  if (!id) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  );
}
