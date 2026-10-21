import Link from "next/link";
import { AirmailRule } from "./motifs";
import { S } from "./strings";

export function SiteHeader() {
  return (
    <header className="relative z-20">
      <AirmailRule />
      <nav
        aria-label="Chính"
        className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-8"
      >
        <Link
          href="/"
          className="group flex items-baseline gap-3 whitespace-nowrap rounded-sm"
        >
          <span className="sign hidden text-[0.7rem] text-gold sm:inline">
            {S.brandSub}
          </span>
          <span className="font-sign text-xl font-extrabold uppercase tracking-wide text-paper transition-colors group-hover:text-gold sm:text-2xl">
            {S.brand}
          </span>
        </Link>
        <ul className="flex shrink-0 items-center gap-0 whitespace-nowrap sm:gap-2">
          <li>
            <Link
              href="/#shelf"
              className="sign rounded-full px-3 py-2 text-xs text-paper/80 transition-colors hover:bg-white/5 hover:text-paper"
            >
              {S.nav.shop}
            </Link>
          </li>
          <li className="hidden min-[380px]:list-item">
            <Link
              href="/#how"
              className="sign rounded-full px-3 py-2 text-xs text-paper/80 transition-colors hover:bg-white/5 hover:text-paper"
            >
              {S.nav.how}
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className="sign rounded-full px-3 py-2 text-xs text-paper/80 transition-colors hover:bg-white/5 hover:text-paper"
            >
              {S.nav.contact}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
