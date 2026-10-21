import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Postmark, WaxSeal } from "@/components/shop/motifs";
import { Shelf, ShelfSkeleton } from "@/components/shop/Shelf";
import { S } from "@/components/shop/strings";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Hero />
      <HowItWorks />
      <section
        id="shelf"
        aria-labelledby="shelf-title"
        className="grain scroll-mt-6 bg-paper-2 text-ink"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
          <header className="mb-12 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-end">
            <h2
              id="shelf-title"
              className="font-sign text-display font-extrabold uppercase leading-[1] tracking-tight"
            >
              {S.home.shelfTitle}
            </h2>
            <p className="max-w-xl text-lg italic leading-relaxed text-ink-2 md:justify-self-end">
              {S.home.shelfLead}
            </p>
          </header>
          <Suspense fallback={<ShelfSkeleton />}>
            <Shelf searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center lg:pb-28 lg:pt-16">
        <div className="rise">
          <p className="sign text-xs text-gold">{S.home.eyebrow}</p>
          <h1 className="mt-5 font-sign text-hero font-extrabold uppercase leading-[0.98] tracking-tight">
            <span className="block">{S.home.title[0]}</span>
            <span className="block">{S.home.title[1]}</span>
            <span className="block text-gold">{S.home.title[2]}</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg italic leading-relaxed text-paper/80 sm:text-xl">
            {S.home.lead}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="#shelf"
              className="sign group inline-flex items-center gap-3 rounded-full bg-post px-7 py-4 text-sm font-bold text-paper shadow-[0_14px_30px_-12px_rgb(200_55_45/0.8)] transition-[transform,background-color] duration-300 hover:bg-post-deep active:scale-[0.98]"
            >
              {S.home.cta}
              <span
                aria-hidden="true"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
            <Link
              href="#how"
              className="sign rounded-full px-4 py-3 text-xs text-paper/70 underline decoration-gold/50 underline-offset-8 transition-colors hover:text-paper"
            >
              {S.nav.how}
            </Link>
          </div>
        </div>
        <Collage />
      </div>
    </section>
  );
}

/* Two cards on the counter, stamped: the shelf's own prints, not stock art. */
function Collage() {
  return (
    <div
      className="relative mx-auto aspect-[5/4] w-full max-w-xl"
      aria-hidden="true"
    >
      <div className="stamp absolute left-[4%] top-[6%] w-[74%] rotate-[-5deg] bg-paper shadow-[var(--shadow-lift)]">
        <Image
          src="/thumbs/flower-letter.jpg"
          alt=""
          width={960}
          height={600}
          priority
          sizes="(min-width: 1024px) 34vw, 74vw"
          className="aspect-[16/10] h-auto w-full object-cover"
        />
      </div>
      <div className="stamp absolute bottom-[4%] right-[2%] w-[58%] rotate-[4deg] bg-paper shadow-[var(--shadow-lift)]">
        <Image
          src="/thumbs/mochi.jpg"
          alt=""
          width={960}
          height={600}
          sizes="(min-width: 1024px) 27vw, 58vw"
          className="aspect-[16/10] h-auto w-full object-cover"
        />
      </div>
      <Postmark
        top="BƯU CỤC ĐÊM"
        bottom="SÀI GÒN · HÀ NỘI"
        middle="20·10"
        className="absolute bottom-[30%] left-0 w-[44%] rotate-[-12deg] text-gold/90 drop-shadow"
      />
      <WaxSeal
        letters="AR"
        className="absolute right-[12%] top-[2%] w-[16%] rotate-[10deg] drop-shadow-lg"
      />
      <p className="absolute bottom-[-2%] left-[6%] rotate-[-3deg] font-hand text-3xl text-paper/90 sm:text-4xl">
        gửi người thương…
      </p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-6 border-y border-white/10 bg-night-2/60"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] lg:py-20">
        <h2
          id="how-title"
          className="text-balance font-sign text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-5xl"
        >
          {S.home.stepsTitle}
        </h2>
        <ol className="grid gap-8 sm:grid-cols-3">
          {S.home.steps.map((s, i) => (
            <li
              key={s.n}
              className={`relative border-t-2 pt-5 ${["border-gold", "border-post", "border-airmail"][i]}`}
            >
              <span className="font-sign text-6xl font-extrabold leading-none text-transparent [-webkit-text-stroke:1.5px_var(--color-paper)] opacity-60">
                {s.n}
              </span>
              <h3 className="sign mt-3 text-lg font-bold text-paper">
                {s.title}
              </h3>
              <p className="mt-2 leading-relaxed text-paper/75">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
