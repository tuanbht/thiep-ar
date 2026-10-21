"use client";
/* The form's inputs, as writing on ruled paper: a label in small capitals, the words on a line, a count when there is
   a limit, the problem in red under it. */
import { useId, type ReactNode, type Ref } from "react";
import { S } from "./strings";

interface FieldProps {
  label: string;
  value: string;
  onChange(v: string): void;
  onBlur?(): void;
  /** the input itself (react-hook-form focuses the first field with a problem) */
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>;
  max?: number;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  error?: string | null;
  placeholder?: string;
  hint?: ReactNode;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  className?: string;
  /** an action beside the label (e.g. remove this paragraph) */
  aside?: ReactNode;
  name?: string;
}

export function Field(p: FieldProps) {
  const id = useId();
  const errId = `${id}-err`,
    hintId = `${id}-hint`;
  const over = p.max != null && p.value.length > p.max;
  const describedBy =
    [p.error ? errId : null, p.hint ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const common = {
    id,
    name: p.name,
    value: p.value,
    placeholder: p.placeholder,
    required: p.required,
    "aria-invalid": !!p.error || over || undefined,
    "aria-describedby": describedBy,
    onChange: (e: { target: { value: string } }) => p.onChange(e.target.value),
    onBlur: p.onBlur,
    ref: p.inputRef,
    className: `peer w-full resize-y border-0 border-b-2 bg-transparent px-0 py-2 text-[1.05rem] leading-relaxed text-ink placeholder:italic placeholder:text-ink-3/70 focus:outline-none focus:ring-0 transition-colors ${p.error || over ? "border-post" : "border-ink/20 hover:border-ink/40 focus:border-gold-deep"}`,
  };
  return (
    <div className={`group ${p.className ?? ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="sign text-[0.7rem] font-bold text-ink-2">
          {p.label}
          {p.required && (
            <span className="text-post" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        <span className="flex items-baseline gap-3">
          {p.max != null && (
            <span
              className={`font-sign text-xs tabular-nums ${over ? "text-post" : "text-ink-3"}`}
            >
              {p.value.length}/{p.max}
            </span>
          )}
          {p.aside}
        </span>
      </div>
      {p.multiline ? (
        <textarea rows={p.rows ?? 3} {...common} />
      ) : (
        <input
          type={p.type ?? "text"}
          autoComplete={p.autoComplete}
          {...common}
        />
      )}
      {p.hint && (
        <p id={hintId} className="mt-1 text-sm italic text-ink-3">
          {p.hint}
        </p>
      )}
      {(p.error || over) && (
        <p
          id={errId}
          role="alert"
          className="mt-1 text-sm font-medium text-post"
        >
          {p.error ?? S.product.tooLong(p.max ?? 0)}
        </p>
      )}
    </div>
  );
}

export function Section({
  n,
  title,
  note,
  children,
  id,
}: {
  n: string;
  title: string;
  note?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id ? `${id}-title` : undefined}
      className="border-t border-ink/15 pt-8 first:border-t-0 first:pt-0"
    >
      <header className="mb-6 flex items-baseline gap-4">
        <span className="font-sign text-3xl font-extrabold leading-none text-post/80">
          {n}
        </span>
        <div>
          <h2
            id={id ? `${id}-title` : undefined}
            className="font-sign text-2xl font-extrabold uppercase tracking-wide text-ink"
          >
            {title}
          </h2>
          {note && <p className="mt-1 text-sm italic text-ink-2">{note}</p>}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
