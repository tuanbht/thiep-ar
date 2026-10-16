import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/domain/types';
import { formatVnd } from './format';
import { S } from './strings';

/* One card on the shelf, framed as a postage stamp: the print as its picture, its price as a red cancellation stamp. */
export function ProductCard({ product, feature = false, index = 0 }: { product: Product; feature?: boolean; index?: number }) {
  const tilt = ['-rotate-[0.6deg]', 'rotate-[0.5deg]', '-rotate-[0.3deg]', 'rotate-[0.8deg]'][index % 4];
  return (
    <Link
      href={`/cards/${product.id}`}
      className={`group lift stamp relative block bg-paper text-ink shadow-[var(--shadow-paper)] ${tilt} ${feature ? 'sm:col-span-2' : ''}`}
      aria-label={`${product.name}, ${formatVnd(product.priceVnd)}`}
    >
      <div className="grain border border-ink/15 bg-paper p-2.5">
        <div className="relative overflow-hidden bg-night">
          <Image
            src={`/thumbs/${product.template}.jpg`}
            alt=""
            width={960}
            height={600}
            sizes={feature ? '(min-width: 1024px) 50vw, 100vw' : '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw'}
            className="aspect-[16/10] h-auto w-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] motion-safe:group-hover:scale-[1.04]"
          />
          <span className="sign absolute left-2 top-2 bg-night/85 px-2 py-1 text-[0.65rem] text-gold">{S.kind[product.kind]}</span>
        </div>
        <div className="flex items-end justify-between gap-3 px-1 pb-1 pt-3">
          <div className="min-w-0">
            <h3 className={`font-sign font-extrabold uppercase leading-none tracking-wide ${feature ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}>{product.name}</h3>
            {product.blurb && <p className="mt-1.5 line-clamp-2 text-sm italic leading-snug text-ink-2">{product.blurb}</p>}
          </div>
          <span className="sign shrink-0 -rotate-6 rounded-sm border-2 border-post px-2 py-1 text-xs font-bold text-post transition-transform duration-500 group-hover:rotate-0">
            {formatVnd(product.priceVnd)}
          </span>
        </div>
      </div>
    </Link>
  );
}
