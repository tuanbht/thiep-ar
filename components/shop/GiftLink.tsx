'use client';
/* The gift's own link once it is paid: the address, a QR code to print with the card, copy, share, open. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import { S } from './strings';

const noSubscribe = () => () => undefined;
const shareable = () => typeof navigator.share === 'function';

export function GiftLink({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(noSubscribe, shareable, () => false);

  useEffect(() => {
    let live = true;
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#231d33', light: '#00000000' } })
      .then(s => { if (live) setSvg(s); }, () => { if (live) setSvg(null); });
    return () => { live = false; };
  }, [url]);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt(S.order.copy, url); }
  }

  return (
    <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="break-all rounded-sm border-2 border-ink bg-paper-2 px-4 py-3 font-sign text-lg font-bold tracking-wide text-ink" data-testid="gift-url">{url}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={url} className="sign group inline-flex items-center gap-2 rounded-full bg-post px-6 py-3 text-xs font-bold text-paper transition-[transform,background-color] duration-300 hover:bg-post-deep active:scale-[0.98]">
            {S.order.open} <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
          <button type="button" onClick={() => void copy()} className="sign rounded-full border-2 border-ink px-5 py-3 text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-paper" aria-live="polite">
            {copied ? S.order.copied : S.order.copy}
          </button>
          {canShare && (
            <button type="button" onClick={() => void navigator.share({ url }).catch(() => undefined)} className="sign rounded-full border-2 border-ink/40 px-5 py-3 text-xs font-bold text-ink-2 transition-colors hover:border-ink hover:text-ink">
              {S.order.share}
            </button>
          )}
        </div>
      </div>
      <figure className="stamp mx-auto w-44 bg-paper sm:mx-0">
        {svg
          // the SVG is drawn here by the qrcode library from our own link: no outside markup goes in
          ? <div className="aspect-square [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={S.order.qr} dangerouslySetInnerHTML={{ __html: svg }} />
          : <div className="aspect-square animate-pulse bg-paper-3/50 motion-reduce:animate-none" />}
        <figcaption className="sign mt-2 text-center text-[0.6rem] text-ink-2">{S.order.qr}</figcaption>
      </figure>
    </div>
  );
}
