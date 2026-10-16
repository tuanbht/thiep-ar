import type { Product } from '@/lib/domain/types';
import { getServices } from '@/lib/server/services';
import { ProductCard } from './ProductCard';
import { S } from './strings';

/* The shelf, read fresh on every request (prices and what is on sale can change any time): 3D acts first, then the
   films; the first of each group stands out. */
export async function Shelf() {
  let products: Product[];
  try {
    products = await getServices().orders.listProducts();
  } catch (e) {
    console.error('[shop] the shelf could not be read', e);
    return <ShelfNote text={S.home.unavailable} />;
  }
  if (!products.length) return <ShelfNote text={S.home.empty} />;
  const groups = (['3d', 'film'] as const).map(kind => ({ kind, items: products.filter(p => p.kind === kind) })).filter(g => g.items.length);
  return (
    <div className="space-y-16">
      {groups.map(g => (
        <section key={g.kind} aria-labelledby={`shelf-${g.kind}`}>
          <h3 id={`shelf-${g.kind}`} className="sign mb-6 flex items-center gap-4 text-sm text-ink-2">
            {S.home.groups[g.kind]}
            <span className="h-px flex-1 bg-ink/15" aria-hidden="true" />
            <span className="text-ink-3">{g.items.length}</span>
          </h3>
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {g.items.map((p, i) => (
              <li key={p.id} className={i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}>
                <ProductCard product={p} feature={i === 0} index={i} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ShelfNote({ text }: { text: string }) {
  return <p className="rounded-sm border border-dashed border-ink/25 px-6 py-10 text-center italic text-ink-2">{text}</p>;
}

/* What the shelf looks like while it is being read. */
export function ShelfSkeleton() {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label={S.loading}>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className={i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}>
          <div className="stamp bg-paper-2">
            <div className="aspect-[16/10] animate-pulse bg-paper-3/60 motion-reduce:animate-none" />
            <div className="mt-3 h-5 w-2/3 bg-paper-3/60" />
            <div className="mt-2 h-4 w-1/2 bg-paper-3/40" />
          </div>
        </li>
      ))}
    </ul>
  );
}
