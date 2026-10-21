"use client";
/* The shelf's search: the words typed (searched a moment after the last key, or at once when the box is left) and the
   categories as tags. Both live in the address (?q=…&c=…), so a search can be shared and Back undoes it; without
   JavaScript it still works, the form being a GET and the tags links. While the cards below are fetched they dim, and
   the tag picked lights at once. The shop's router keeps this page hidden while a card is open: words typed but never
   searched are dropped then, so Back shows the box and the shelf agreeing. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useId,
  useLayoutEffect,
  useOptimistic,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { ShelfCategory } from "@/lib/domain/types";
import { QUERY_MAX, shelfHref, tidyQuery } from "./shelfQuery";
import { S } from "./strings";

const TYPE_PAUSE_MS = 300;

export interface ShelfSearchProps {
  categories: ShelfCategory[];
  /** the words the cards below were found with ('' for none) */
  query: string;
  /** the category they were found in, or null */
  category: string | null;
  /** how many were found */
  total: number;
  /** the cards */
  children: ReactNode;
}

export function ShelfSearch({
  categories,
  query,
  category,
  total,
  children,
}: ShelfSearchProps) {
  const s = useShelfAddress(query, category);
  const name = categories.find((c) => c.id === category)?.name;
  const summary =
    query || name
      ? [
          S.home.search.found(total),
          query && S.home.search.forWords(query),
          name && S.home.search.inCategory(name),
        ]
          .filter(Boolean)
          .join(" ")
      : "";
  return (
    <div>
      <SearchBox
        text={s.text}
        category={s.picked}
        onType={s.type}
        onLeave={s.flush}
        onSubmit={s.submit}
        onClear={s.clear}
      />
      <CategoryTags
        categories={categories}
        query={query}
        picked={s.picked}
        onPick={s.pick}
      />
      <div className="mt-5 flex min-h-6 flex-wrap items-baseline gap-x-3 text-sm italic text-ink-2">
        <p role="status">{summary}</p>
        {summary && (
          <Link
            href="/#shelf"
            prefetch={false}
            scroll={false}
            onClick={(e) => plainClick(e) && s.reset()}
            className="sign text-[0.7rem] not-italic text-ink-2 underline decoration-ink/30 underline-offset-4 hover:text-post"
          >
            {S.home.search.reset}
          </Link>
        )}
      </div>
      <div
        aria-busy={s.pending || undefined}
        className={`mt-8 transition-opacity duration-300 ${s.pending ? "opacity-40" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

/** a click this page handles itself (not one meant for a new tab or window); it stops the link */
function plainClick(e: MouseEvent<HTMLAnchorElement>): boolean {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
    return false;
  e.preventDefault();
  return true;
}

/** The search against the address: the words in the box, the words last asked for, the category picked (lit at once)
    and whether the shelf is being fetched. */
function useShelfAddress(query: string, category: string | null) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const waiting = useRef<string | null>(null); // words typed, not asked for yet
  const shown = useRef(query); // the address's words, as last shown
  const [text, setText] = useState(query);
  const [seen, setSeen] = useState(query);
  const [sent, setSent] = useState(query); // the words last asked for
  const [picked, setPicked] = useOptimistic(category);
  const [pending, setPending] = useOptimistic(false);

  if (query !== seen) {
    // the address changed: by this box, or elsewhere (Back)
    setSeen(query);
    if (query !== sent) {
      setText(query);
      setSent(query);
    }
  }
  useEffect(() => {
    shown.current = query;
  }, [query]);
  useLayoutEffect(
    () => () => {
      // hidden (a card is open) or gone: drop what was not asked for
      clearTimeout(timer.current);
      waiting.current = null;
      setText(shown.current);
      setSent(shown.current);
    },
    [],
  );

  function go(words: string, to: string | null, how: "push" | "replace") {
    clearTimeout(timer.current);
    waiting.current = null;
    setSent(words);
    startTransition(async () => {
      setPicked(to);
      setPending(true);
      router[how](shelfHref({ q: words, c: to }), { scroll: false });
    });
  }
  function flush() {
    // the words waiting, asked for now
    const words = waiting.current;
    if (words !== null && words !== sent) go(words, picked, "replace");
    else {
      clearTimeout(timer.current);
      waiting.current = null;
    }
  }
  return {
    text,
    picked,
    pending,
    flush,
    type(value: string) {
      setText(value);
      clearTimeout(timer.current);
      waiting.current = tidyQuery(value);
      timer.current = setTimeout(flush, TYPE_PAUSE_MS);
    },
    submit: () => go(tidyQuery(text), picked, "push"),
    clear: () => {
      setText("");
      go("", picked, "replace");
    },
    reset: () => {
      setText("");
      go("", null, "push");
    },
    pick: (e: MouseEvent<HTMLAnchorElement>, to: string | null) => {
      if (plainClick(e)) go(tidyQuery(text), to === picked ? null : to, "push");
    },
  };
}

interface SearchBoxProps {
  text: string;
  category: string | null;
  onType(value: string): void;
  onLeave(): void;
  onSubmit(): void;
  onClear(): void;
}

function SearchBox({
  text,
  category,
  onType,
  onLeave,
  onSubmit,
  onClear,
}: SearchBoxProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return (
    <form
      role="search"
      action="/#shelf"
      method="get"
      className="max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor={id} className="sign text-xs text-ink-2">
        {S.home.search.label}
      </label>
      <div className="mt-2 flex items-center gap-3 border-b-2 border-ink pb-2 transition-colors duration-300 focus-within:border-post">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-6 w-6 shrink-0 text-ink-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </svg>
        <input
          ref={input}
          id={id}
          type="search"
          name="q"
          value={text}
          onChange={(e) => onType(e.target.value)}
          onBlur={onLeave}
          maxLength={QUERY_MAX}
          placeholder={S.home.search.placeholder}
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-xl italic text-ink placeholder:text-ink-3 focus:outline-none sm:text-2xl [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label={S.home.search.clear}
            onClick={() => {
              onClear();
              input.current?.focus();
            }}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl leading-none text-ink-2 transition-colors hover:bg-ink hover:text-paper focus-visible:outline-3 focus-visible:outline-gold"
          >
            ×
          </button>
        )}
        {category && <input type="hidden" name="c" value={category} />}
      </div>
    </form>
  );
}

interface CategoryTagsProps {
  categories: ShelfCategory[];
  /** the words the shelf shows, for the links */
  query: string;
  picked: string | null;
  onPick(e: MouseEvent<HTMLAnchorElement>, to: string | null): void;
}

function CategoryTags({
  categories,
  query,
  picked,
  onPick,
}: CategoryTagsProps) {
  return (
    /* on a phone the tags scroll sideways, the edge fading to say there are more */
    <nav
      aria-label={S.home.search.categories}
      className="-mx-4 mt-6 overflow-x-auto px-4 pb-2 [mask-image:linear-gradient(to_right,#000_85%,transparent)] [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 sm:[mask-image:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex gap-2 sm:flex-wrap">
        <li>
          <Tag
            href={shelfHref({ q: query }, "#shelf")}
            active={!picked}
            onClick={(e) => onPick(e, null)}
          >
            {S.home.search.all}
          </Tag>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <Tag
              href={shelfHref({ q: query, c: c.id }, "#shelf")}
              active={picked === c.id}
              count={c.count}
              title={c.blurb ?? undefined}
              onClick={(e) => onPick(e, c.id)}
            >
              {c.name}
            </Tag>
          </li>
        ))}
      </ul>
    </nav>
  );
}

interface TagProps {
  href: string;
  active: boolean;
  count?: number;
  title?: string;
  onClick(e: MouseEvent<HTMLAnchorElement>): void;
  children: ReactNode;
}

/* A category as a luggage tag: a punched hole, its name, how many cards. */
function Tag({ href, active, count, title, onClick, children }: TagProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      scroll={false}
      onClick={onClick}
      aria-current={active || undefined}
      title={title}
      className={`sign inline-flex items-center gap-2 whitespace-nowrap rounded-sm border px-3 py-2 text-[0.7rem] transition-[transform,background-color,border-color,color] duration-200 hover:-rotate-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.97] ${
        active
          ? "border-post bg-post text-paper shadow-[0_10px_20px_-12px_rgb(200_55_45/0.9)]"
          : "border-ink/25 bg-paper text-ink hover:border-ink"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ring-1 ${active ? "bg-post-deep ring-paper/60" : "bg-paper-2 ring-ink/30"}`}
      />
      {children}
      {count !== undefined && (
        <span
          className={`tabular-nums ${active ? "text-paper/75" : "text-ink-3"}`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
