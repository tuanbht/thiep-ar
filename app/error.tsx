"use client";
import Link from "next/link";
import { useEffect } from "react";
import { S } from "@/components/shop/strings";

export default function ErrorPage({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[shop] a page failed", error);
  }, [error]);
  return (
    <main className="grid flex-1 place-items-center px-4 py-24 text-center">
      <div className="max-w-md">
        <p className="sign text-xs text-post">{S.brand}</p>
        <h1 className="mt-4 font-sign text-5xl font-extrabold uppercase leading-none">
          {S.error.title}
        </h1>
        <p className="mt-4 text-lg italic text-paper/75">{S.error.body}</p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => retry()}
            className="sign rounded-full bg-post px-6 py-3 text-xs font-bold text-paper transition-colors hover:bg-post-deep"
          >
            {S.error.retry}
          </button>
          <Link
            href="/"
            className="sign rounded-full border-2 border-paper/60 px-6 py-3 text-xs text-paper transition-colors hover:border-gold hover:text-gold"
          >
            {S.error.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
