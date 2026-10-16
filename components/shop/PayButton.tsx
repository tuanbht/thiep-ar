'use client';
/* "Thanh toán": asks the server to start the payment, then goes where it says (the order page when paid at once, the
   payment gateway otherwise). */
import { useState } from 'react';
import type { PayResponse } from '@/lib/api/dto';
import { S } from './strings';

export function PayButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      const json = (await res.json().catch(() => ({}))) as Partial<PayResponse> & { error?: string };
      if (!res.ok || !json.redirect) throw new Error(json.error || S.checkout.payFailed);
      window.location.assign(json.redirect);
    } catch (e) {
      setError(e instanceof Error ? e.message : S.checkout.payFailed);
      setBusy(false);
    }
  }
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
