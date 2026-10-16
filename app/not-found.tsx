import Link from 'next/link';
import { AirmailRule, Postmark } from '@/components/shop/motifs';
import { S } from '@/components/shop/strings';

export default function NotFound() {
  return (
    <>
      <AirmailRule />
      <main className="grid flex-1 place-items-center px-4 py-24 text-center">
        <div className="max-w-md">
          <Postmark top="BƯU CỤC ĐÊM" bottom="KHÔNG CÓ NGƯỜI NHẬN" middle="404" className="mx-auto w-52 -rotate-6 text-gold/80" />
          <h1 className="mt-6 font-sign text-5xl font-extrabold uppercase leading-none">{S.notFound.title}</h1>
          <p className="mt-4 text-lg italic text-paper/75">{S.notFound.body}</p>
          <Link href="/" className="sign mt-8 inline-block rounded-full bg-post px-6 py-3 text-xs font-bold text-paper transition-colors hover:bg-post-deep">{S.notFound.home}</Link>
        </div>
      </main>
    </>
  );
}
