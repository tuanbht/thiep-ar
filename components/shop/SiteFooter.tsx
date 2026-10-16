import Link from 'next/link';
import { CONTACT } from '@/lib/contact';
import { Postmark } from './motifs';
import { S } from './strings';

export function SiteFooter() {
  return (
    <footer className="relative mt-auto border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="max-w-md">
          <p className="font-sign text-xl font-extrabold uppercase tracking-wide">{S.brand}</p>
          <p className="mt-2 text-sm italic text-paper/70">{S.footer.line}</p>
          <p className="mt-1 text-sm text-paper/50">{S.footer.note}</p>
          <p className="mt-4 text-sm">
            <Link href="/about" className="sign text-xs text-gold underline-offset-4 hover:underline">{S.footer.contact}</Link>
            <span className="text-paper/30" aria-hidden="true"> · </span>
            <a href={`mailto:${CONTACT.email}`} className="text-paper/70 underline-offset-4 hover:text-paper hover:underline">{CONTACT.email}</a>
          </p>
        </div>
        <Postmark top="BƯU CỤC ĐÊM" bottom="THIỆP AR" middle="★" className="h-20 w-auto text-paper/25" />
      </div>
    </footer>
  );
}
