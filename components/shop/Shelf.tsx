import type { Product, ShelfCategory } from '@/lib/domain/types';
import { getServices } from '@/lib/server/services';
import { ProductCard } from './ProductCard';
import { readShelfParams } from './shelfQuery';
import { ShelfSearch } from './ShelfSearch';
import { S } from './strings';

type Search = Record<string, string | string[] | undefined>;

/* The shelf, read fresh on every request (prices and what is on sale can change any time), under its search
   (ShelfSearch: ?q=words&c=category). As it stands: 3D acts first, then the films, the first of each group standing
   out. Searched or filtered: the cards found, best match first. */
export async function Shelf({ searchParams }: { searchParams?: Promise<Search> }) {
  const { q, c } = readShelfParams((await searchParams) ?? {});
  const orders = getServices().orders;
  let products: Product[], categories: ShelfCategory[];
  try {
    [categories, products] = await Promise.all([orders.listCategories(), orders.listProducts({ query: q || undefined, category: c ?? undefined })]);
    if (c && !categories.some(x => x.id === c)) products = await orders.listProducts({ query: q || undefined });   // no such category: all
  } catch (e) {
    console.error('[shop] the shelf could not be read', e);
    return <ShelfNote text={S.home.unavailable} />;
  }
  const category = c && categories.some(x => x.id === c) ? c : null;
  const filtered = !!q || !!category;
  return (
    <ShelfSearch categories={categories} query={q} category={category} total={products.length}>
      {products.length === 0
        ? (filtered ? <NoMatch /> : <ShelfNote text={S.home.empty} />)
        : (filtered ? <Found products={products} /> : <Groups products={products} />)}
    </ShelfSearch>
  );
}

function Groups({ products }: { products: Product[] }) {
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

/* What a search found, best match first: one even grid, no card standing out. */
function Found({ products }: { products: Product[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p, i) => <li key={p.id}><ProductCard product={p} index={i} /></li>)}
    </ul>
  );
}

function NoMatch() {
  return (
    <div className="rounded-sm border border-dashed border-ink/25 px-6 py-12 text-center">
      <p className="font-hand text-3xl text-post">{S.home.search.none}</p>
      <p className="mt-2 italic text-ink-2">{S.home.search.noneHint}</p>
    </div>
  );
}

export function ShelfNote({ text }: { text: string }) {
  return <p className="rounded-sm border border-dashed border-ink/25 px-6 py-10 text-center italic text-ink-2">{text}</p>;
}

/* What the shelf looks like while it is being read: its search too, so nothing jumps when it arrives. */
export function ShelfSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label={S.loading}>
      <div className="max-w-3xl">
        <div className="h-4 w-20 bg-paper-3/60" />
        <div className="mt-2 h-11 border-b-2 border-ink/20" />
      </div>
      <div className="mt-6 flex gap-2 overflow-hidden pb-2">
        {Array.from({ length: 7 }, (_, i) => <div key={i} className="h-[2.125rem] w-24 shrink-0 rounded-sm bg-paper-3/50" />)}
      </div>
      <div className="mt-5 min-h-6" />
      <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
