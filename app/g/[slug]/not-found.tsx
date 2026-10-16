import Link from 'next/link';
import { Postmark } from '@/components/shop/motifs';
import { S } from '@/components/shop/strings';

export default function GiftNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div className="max-w-md">
        <Postmark top="KHÔNG GỬI ĐƯỢC" bottom="TRẢ LẠI NGƯỜI GỬI" middle="?" className="mx-auto w-48 text-post/80" />
        <h1 className="mt-6 font-sign text-4xl font-extrabold uppercase leading-none">{S.gift.goneTitle}</h1>
        <p className="mt-4 text-lg italic text-paper/75">{S.gift.goneBody}</p>
        <Link href="/" className="sign mt-8 inline-block rounded-full border-2 border-paper/60 px-6 py-3 text-xs text-paper transition-colors hover:border-gold hover:text-gold">{S.notFound.home}</Link>
      </div>
    </main>
  );
}
