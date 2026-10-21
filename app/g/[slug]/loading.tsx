import { S } from "@/components/shop/strings";

export default function Loading() {
  return (
    <div
      className="fixed inset-0 grid place-items-center bg-night"
      aria-busy="true"
    >
      <p className="sign animate-pulse text-xs text-gold motion-reduce:animate-none">
        {S.gift.loading}
      </p>
    </div>
  );
}
