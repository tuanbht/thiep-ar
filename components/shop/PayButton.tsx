'use client';
/* "Thanh toán": asks the server to start the payment. The test provider pays at once (go to the order); SePay hands back
   a VietQR code: the buyer scans it with their banking app, and this page asks every few seconds whether the money has
   arrived, then shows the order (the gift link). `auto` starts at once (SePay: the QR is the checkout). */
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderView, PaymentQr } from '@/lib/api/dto';
import { formatVnd } from './format';
import { S } from './strings';

const POLL_MS = 3000;
const WAIT_MS = 20 * 60_000;

export function PayButton({ orderId, auto = false }: { orderId: string; auto?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<PaymentQr | null>(null);
  const started = useRef(false);

  const pay = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const json = (await res.json().catch(() => ({}))) as Partial<{ redirect: string; qr: PaymentQr; error: string }>;
      if (res.ok && json.qr) { setQr(json.qr); setBusy(false); return; }
      if (!res.ok || !json.redirect) throw new Error(json.error || S.checkout.payFailed);
      if (json.redirect.startsWith('/')) router.push(json.redirect);
      else window.location.assign(json.redirect);                     // a payment gateway's own page
    } catch (e) {
      setError(e instanceof Error ? e.message : S.checkout.payFailed);
      setBusy(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (auto && !started.current) { started.current = true; void pay(); }
  }, [auto, pay]);

  if (qr) return <QrPayment orderId={orderId} qr={qr} />;
  return (
    <div>
      <button type="button" onClick={() => void pay()} disabled={busy}
        className="sign group inline-flex w-full items-center justify-center gap-3 rounded-full bg-post px-8 py-4 text-sm font-bold text-paper shadow-[0_14px_30px_-14px_rgb(200_55_45/0.9)] transition-[transform,background-color,opacity] duration-300 hover:bg-post-deep active:scale-[0.98] disabled:cursor-wait disabled:opacity-70 sm:w-auto">
        {busy ? S.checkout.paying : S.checkout.pay}
        {!busy && <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>}
      </button>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-post">{error}</p>}
    </div>
  );
}

/** The transfer to make, and the wait for it: polls the order until it is paid, then shows it. */
export function QrPayment({ orderId, qr }: { orderId: string; qr: PaymentQr }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const until = Date.now() + WAIT_MS;
    let stop = false;
    const timer = setInterval(async () => {
      if (stop) return;
      if (Date.now() > until) { clearInterval(timer); setGaveUp(true); return; }
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const view = (await res.json()) as OrderView;
        if (!stop && view.status === 'paid') { stop = true; clearInterval(timer); router.push(`/orders/${orderId}`); }
      } catch { /* offline for a moment: the next tick tries again */ }
    }, POLL_MS);
    return () => { stop = true; clearInterval(timer); };
  }, [orderId, round, router]);

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start" data-testid="qr-payment">
      <figure className="stamp mx-auto w-full max-w-[16rem] bg-white p-2 sm:mx-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- SePay's VietQR image, made for this transfer */}
        <img src={qr.imageUrl} alt={S.checkout.qrAlt} width={480} height={480} className="h-auto w-full" />
      </figure>
      <div>
        <h2 className="font-sign text-2xl font-extrabold uppercase leading-none">{S.checkout.qrTitle}</h2>
        <p className="mt-2 text-sm italic leading-relaxed text-ink-2">{S.checkout.qrHow}</p>
        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)]">
          <Row label={S.checkout.qrBank} value={qr.bankName} />
          <Row label={S.checkout.qrAccount} value={qr.accountNumber} copy />
          <Row label={S.checkout.qrHolder} value={qr.accountName} />
          <Row label={S.checkout.qrAmount} value={formatVnd(qr.amountVnd)} copy={String(qr.amountVnd)} strong />
          <Row label={S.checkout.qrContent} value={qr.content} copy strong />
        </dl>
        <p className="mt-2 text-xs italic text-post">{S.checkout.qrContentNote}</p>
        <div className="mt-6 flex items-center gap-3 text-ink-2" role="status" aria-live="polite">
          {!gaveUp && (
            <span className="relative flex h-3 w-3" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-post/60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-post" />
            </span>
          )}
          <p className="text-sm italic">{gaveUp ? S.checkout.qrGaveUp : S.checkout.qrWaiting}</p>
          {gaveUp && (
            <button type="button" onClick={() => { setGaveUp(false); setRound(r => r + 1); }}
              className="sign rounded-full border-2 border-ink px-4 py-2 text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold">
              {S.checkout.qrCheckAgain}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, copy, strong }: { label: string; value: string; copy?: boolean | string; strong?: boolean }) {
  const [copied, setCopied] = useState(false);
  const text = typeof copy === 'string' ? copy : value;
  return (
    <>
      <dt className="sign self-center text-[0.7rem] text-ink-2">{label}</dt>
      <dd className="flex min-w-0 items-center gap-3">
        <span className={`break-all font-sign tracking-wide ${strong ? 'text-xl font-extrabold text-post' : 'text-lg font-bold'}`}>{value}</span>
        {copy && (
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
            className="sign shrink-0 rounded-full border border-ink/40 px-3 py-1 text-[0.65rem] text-ink-2 transition-colors hover:border-ink hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
            aria-label={`${S.checkout.copy} ${label}`}>
            {copied ? S.checkout.copied : S.checkout.copy}
          </button>
        )}
      </dd>
    </>
  );
}
