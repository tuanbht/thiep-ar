import type { Metadata } from 'next';
import Image from 'next/image';
import { Postmark } from '@/components/shop/motifs';
import { S } from '@/components/shop/strings';
import { CONTACT } from '@/lib/contact';
import { zaloQrSrc } from '@/lib/contact-server';

export const metadata: Metadata = { title: S.about.title, description: S.about.lead };

/* Who we are, and how to reach us: the email and the Zalo QR code (shown once it is saved in public/contact/). */
export default function AboutPage() {
  const qr = zaloQrSrc();
  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-6 sm:px-8">
      <p className="sign text-xs text-gold">{S.about.eyebrow}</p>
      <h1 className="mt-3 font-sign text-display font-extrabold uppercase leading-[1]">{S.about.title}</h1>
      <p className="mt-6 max-w-2xl text-lg italic leading-relaxed text-paper/80">{S.about.lead}</p>

      <div id="lien-he" className="grain relative mt-12 scroll-mt-24 bg-paper px-6 py-8 text-ink shadow-[var(--shadow-lift)] sm:px-10 sm:py-10">
        <div className="airmail absolute inset-x-0 top-0 h-1.5" aria-hidden="true" />
        <Postmark top="BƯU CỤC ĐÊM" bottom="LIÊN HỆ" middle="✉" className="absolute -top-8 right-1 w-32 rotate-[12deg] text-post/60 sm:-right-4 sm:w-44" />
        <h2 className="font-sign text-3xl font-extrabold uppercase leading-none sm:text-4xl">{S.about.contactTitle}</h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-2">{S.about.contactBody}</p>

        <div className={`mt-8 grid gap-8 ${qr ? 'sm:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
          <div>
            <p className="sign text-[0.7rem] text-ink-2">{S.about.email}</p>
            <a href={`mailto:${CONTACT.email}`}
              className="mt-2 inline-block break-all font-sign text-2xl font-bold tracking-wide text-post underline decoration-post/30 underline-offset-4 transition-colors hover:decoration-post focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold">
              {CONTACT.email}
            </a>
          </div>
          {qr && (
            <figure className="max-w-60">
              <p className="sign text-[0.7rem] text-ink-2">{S.about.zalo}</p>
              <div className="stamp mt-2 bg-paper-2 p-2">
                <Image src={qr} alt={S.about.zaloAlt} width={480} height={480} sizes="15rem" className="h-auto w-full bg-white" />
              </div>
              <figcaption className="mt-3 text-sm italic leading-relaxed text-ink-2">{S.about.zaloHow}</figcaption>
            </figure>
          )}
        </div>
      </div>
    </section>
  );
}
