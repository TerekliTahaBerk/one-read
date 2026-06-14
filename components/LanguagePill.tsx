"use client";

import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  label: string;
};

/**
 * A small segmented pill used for language toggles.
 * Designed to live inline next to a label, keeps the form lightweight.
 */
export function LanguagePill({
  selected,
  label,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={[
        "focus-ring",
        "inline-flex items-center justify-center",
        "h-8 px-3.5 rounded-full",
        "text-[13px] leading-none",
        "border transition-[color,background-color,border-color] duration-200",
        selected
          ? "bg-ink text-paper border-ink"
          : "bg-transparent text-ash border-line hover:text-ink hover:border-line-strong",
        className,
      ].join(" ")}
      {...rest}
    >
      <span className="font-sans">{label}</span>
    </button>
  );
}
