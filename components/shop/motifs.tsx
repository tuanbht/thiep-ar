/* The post office's marks: a round postmark with its date, the wavy cancellation lines, a wax seal. Drawn as SVG so
   they stay sharp and take the text colour. */
import { useId } from "react";

export function Postmark({
  top,
  bottom,
  middle,
  className = "",
}: {
  top: string;
  bottom: string;
  middle: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden="true">
      <defs>
        <path id={`${id}-t`} d="M22 60 a38 38 0 0 1 76 0" />
        <path id={`${id}-b`} d="M18 60 a42 42 0 0 0 84 0" />
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="2.2">
        <circle cx="60" cy="60" r="50" />
        <circle cx="60" cy="60" r="34" strokeWidth="1.4" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M118 ${36 + i * 12} q12 -7 24 0 t24 0 t24 0 t24 0`}
            strokeWidth="2"
          />
        ))}
      </g>
      <g
        fill="currentColor"
        style={{
          fontFamily: "var(--font-sign)",
          fontWeight: 700,
          letterSpacing: "0.14em",
        }}
      >
        <text fontSize="11">
          <textPath href={`#${id}-t`} startOffset="50%" textAnchor="middle">
            {top}
          </textPath>
        </text>
        <text fontSize="11">
          <textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">
            {bottom}
          </textPath>
        </text>
        <text x="60" y="66" fontSize="17" textAnchor="middle">
          {middle}
        </text>
      </g>
    </svg>
  );
}

export function WaxSeal({
  letters,
  className = "",
}: {
  letters: string;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        fill="var(--color-post)"
        d="M32 3c5 0 7 4 11 5s9-1 11 3-1 8 1 12 6 6 5 11-6 6-7 10 1 9-3 11-8-1-12 1-6 6-11 6-7-4-11-6-9 1-11-3 1-8-1-12-6-6-5-11 6-6 7-10-1-9 3-11 8 1 12-1 6-6 11-6z"
      />
      <circle
        cx="32"
        cy="32"
        r="17"
        fill="none"
        stroke="var(--color-post-deep)"
        strokeWidth="2"
      />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        fill="var(--color-paper)"
        fontSize="16"
        style={{
          fontFamily: "var(--font-sign)",
          fontWeight: 800,
          letterSpacing: "0.04em",
        }}
      >
        {letters}
      </text>
    </svg>
  );
}

export const AirmailRule = ({ className = "" }: { className?: string }) => (
  <div className={`airmail h-2 w-full ${className}`} aria-hidden="true" />
);
