import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { CustomizeForm } from '@/components/shop/CustomizeForm';
import { formatVnd } from '@/components/shop/format';
import { shelfHref } from '@/components/shop/shelfQuery';
import { S } from '@/components/shop/strings';
import { getTemplateInfo } from '@/lib/catalog/templates';
import type { ShelfCategory } from '@/lib/domain/types';
import { getServices } from '@/lib/server/services';

/** the shelf's categories, to name the card's; without them the page still opens */
async function categories(): Promise<ShelfCategory[]> {
  try { return await getServices().orders.listCategories(); } catch (e) {
    console.error('[shop] the categories could not be read', e);
    return [];
  }
}

/** the product on sale, its template and its categories: once per request (the metadata and the page both ask) */
const load = cache(async (productId: string) => {
  const product = await getServices().orders.getProduct(productId);
  if (!product || !product.active) return null;
  const [info, all] = await Promise.all([getTemplateInfo(product.template), categories()]);
  const labels = product.categories.flatMap(id => all.filter(c => c.id === id));
  return { product, info, labels };
});

export async function generateMetadata({ params }: PageProps<'/cards/[productId]'>): Promise<Metadata> {
  const { productId } = await params;
  const found = await load(productId);
  return found ? { title: found.product.name, description: found.product.blurb ?? undefined } : {};
}

export default async function ProductPage({ params }: PageProps<'/cards/[productId]'>) {
  const { productId } = await params;
  const found = await load(productId);
  if (!found) notFound();
  const { product, info, labels } = found;
  return (
    <>
      <header className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-8">
        <Link href="/#shelf" className="sign inline-flex items-center gap-2 text-xs text-paper/70 transition-colors hover:text-gold">
          <span aria-hidden="true">←</span> {S.product.back}
        </Link>
        <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="sign text-xs text-gold">{S.kind[product.kind]} · {S.product.write}</p>
            <h1 className="mt-3 font-sign text-display font-extrabold uppercase leading-[1] tracking-tight">{product.name}</h1>
            {product.blurb && <p className="mt-4 max-w-2xl text-lg italic text-paper/75">{product.blurb}</p>}
            {labels.length > 0 && (
              <ul aria-label={S.home.search.categories} className="mt-5 flex flex-wrap gap-2">
                {labels.map(c => (
                  <li key={c.id}>
                    <Link href={shelfHref({ c: c.id }, '#shelf')}
                      className="sign inline-flex rounded-sm border border-paper/25 px-3 py-1.5 text-[0.7rem] text-paper/80 transition-colors hover:border-gold hover:text-gold">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="stamp w-36 rotate-[3deg] bg-paper min-[380px]:w-40 sm:w-52">
              <Image src={`/thumbs/${product.template}.jpg`} alt="" width={960} height={600} sizes="13rem" loading="eager" fetchPriority="high" className="aspect-[16/10] h-auto w-full object-cover" />
            </div>
            <p className="font-sign text-4xl font-extrabold tabular-nums text-gold">{formatVnd(product.priceVnd)}</p>
          </div>
        </div>
      </header>
      {info?.form
        ? <CustomizeForm product={product} form={info.form} />
        : <p className="mx-auto mb-20 max-w-xl px-4 text-center italic text-paper/70">{S.product.noForm}</p>}
    </>
  );
}
