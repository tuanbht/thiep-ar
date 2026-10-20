'use client';
/* An order's state, kept fresh: while it waits for payment it asks the server every 2 s (for up to 2 min); once paid
   it shows the gift's link, and the draft this order was made from is let go (the next card starts afresh). */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { OrderView } from '@/lib/api/dto';
import { releaseDraft } from './draftStore';
import { formatDateTime, formatVnd } from './format';
import { GiftLink } from './GiftLink';
import { S } from './strings';

const EVERY_MS = 2000, FOR_MS = 120_000;

export function OrderStatus({ initial }: { initial: OrderView }) {
  const [view, setView] = useState(initial);
  const [gaveUp, setGaveUp] = useState(false);
  const [round, setRound] = useState(0);              // "check again" starts another two minutes of asking

  useEffect(() => { if (view.status === 'paid') releaseDraft(view.product.id, view.id); }, [view.status, view.product.id, view.id]);

  useEffect(() => {
    if (view.status !== 'pending') return;
    const until = Date.now() + FOR_MS;
    let stop = false;
    const timer = setInterval(async () => {
      if (stop) return;
      if (Date.now() > until) { clearInterval(timer); setGaveUp(true); return; }
      try {
        const res = await fetch(`/api/orders/${view.id}`, { cache: 'no-store' });
        if (res.ok) {
          const next = (await res.json()) as OrderView;
          if (!stop && next.status !== 'pending') { clearInterval(timer); setView(next); }
        }
      } catch { /* offline for a moment: the next tick tries again */ }
    }, EVERY_MS);
    return () => { stop = true; clearInterval(timer); };
  }, [view.id, view.status, round]);

  const titles: Record<OrderView['status'], string> = {
    pending: S.order.pendingTitle, paid: S.order.paidTitle, failed: S.order.failedTitle, cancelled: S.order.cancelledTitle, refunded: S.order.refundedTitle
  };

  return (
    <div className="grain relative mt-10 bg-paper px-6 py-8 text-ink shadow-[var(--shadow-lift)] sm:px-10 sm:py-10" data-status={view.status}>
      <div className="airmail absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="font-sign text-3xl font-extrabold uppercase leading-none sm:text-4xl" aria-live="polite">{titles[view.status]}</h2>
        <p className="font-sign text-2xl font-bold tabular-nums text-post">{formatVnd(view.amountVnd)}</p>
      </div>

      {view.status === 'pending' && (
        <div className="mt-5 flex items-center gap-3 text-ink-2" role="status">
          <span className="relative flex h-3 w-3" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-post/60 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-post" />
          </span>
          <p className="italic">{gaveUp ? S.order.timeout : S.order.pendingBody}</p>
          {gaveUp && (
            <button type="button" onClick={() => { setGaveUp(false); setRound(r => r + 1); }}
              className="sign rounded-full border-2 border-ink px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold">
              {S.order.checkAgain}
            </button>
          )}
        </div>
      )}

      {view.status === 'paid' && view.giftUrl && (
        <>
          <p className="mt-4 max-w-2xl italic leading-relaxed text-ink-2">{S.order.paidBody}</p>
          <div className="mt-8"><GiftLink url={view.giftUrl} /></div>
          {view.paidAt && <p className="sign mt-6 text-[0.7rem] text-ink-3">{S.order.paidAt} {formatDateTime(view.paidAt)}</p>}
          <div className="mt-10 border-t-2 border-dashed border-ink/20 pt-6">
            <h3 className="font-hand text-3xl text-post">{S.order.howTitle}</h3>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {S.order.how.map((t, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-sign text-2xl font-extrabold leading-none text-ink/30">{i + 1}</span>
                  <p className="text-sm leading-relaxed text-ink-2">{t}</p>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      {(view.status === 'failed' || view.status === 'cancelled') && (
        <div className="mt-5">
          <p className="italic text-ink-2">{S.order.failedBody}</p>
          {view.status === 'failed' && (
            <Link href={`/checkout/${view.id}`} className="sign mt-5 inline-block rounded-full bg-post px-6 py-3 text-xs font-bold text-paper hover:bg-post-deep">{S.order.retry}</Link>
          )}
        </div>
      )}
    </div>
  );
}
