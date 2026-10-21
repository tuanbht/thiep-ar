import { S } from "@/components/shop/strings";

export default function Loading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-8"
      aria-busy="true"
    >
      <p className="sign text-xs text-gold">{S.loading}</p>
      <div className="mt-4 h-16 w-2/3 animate-pulse bg-white/5 motion-reduce:animate-none" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <div className="h-[70vh] animate-pulse bg-paper/10 motion-reduce:animate-none" />
        <div className="hidden aspect-[4/5] animate-pulse bg-white/5 motion-reduce:animate-none lg:block" />
      </div>
    </div>
  );
}
