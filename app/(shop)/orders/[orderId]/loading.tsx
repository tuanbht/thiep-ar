import { S } from '@/components/shop/strings';

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8" aria-busy="true">
      <p className="sign text-xs text-gold">{S.loading}</p>
      <div className="mt-4 h-14 w-1/2 animate-pulse bg-white/5 motion-reduce:animate-none" />
      <div className="mt-10 h-80 animate-pulse bg-paper/10 motion-reduce:animate-none" />
    </div>
  );
}
