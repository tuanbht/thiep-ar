/* The end of every order: where to turn if something went wrong, with the order's code to quote. */
import Link from "next/link";
import { CONTACT } from "@/lib/contact";
import { S } from "./strings";

export function ContactNote({ code }: { code?: string }) {
  return (
    <aside
      aria-labelledby="help-title"
      className="relative mt-12 border-l-4 border-gold bg-night-2/70 px-6 py-6 sm:px-8"
    >
      <h2
        id="help-title"
        className="font-sign text-2xl font-extrabold uppercase leading-none text-gold"
      >
        {S.help.title}
      </h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-paper/80">
        {S.help.body}
        {code ? (
          <>
            {" "}
            <span className="whitespace-nowrap font-sign font-bold tracking-wide text-paper">
              {code}
            </span>
          </>
        ) : null}
        .
      </p>
      <Link
        href={CONTACT.page}
        className="sign group mt-5 inline-flex items-center gap-2 rounded-full border-2 border-paper/70 px-5 py-2.5 text-xs font-bold text-paper transition-colors hover:border-gold hover:bg-gold hover:text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        {S.help.cta}
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
        >
          →
        </span>
      </Link>
    </aside>
  );
}
