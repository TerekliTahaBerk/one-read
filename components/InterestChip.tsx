"use client";

import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected: boolean;
  label: string;
};

/**
 * A soft, premium toggle chip for selecting interests.
 * - Default: hairline border, ivory surface
 * - Hover:   slightly stronger border + ink text
 * - Active:  ink fill, ivory text, with a delicate inset ring
 */
export function InterestChip({
  selected,
  label,
  className = "",
  ...rest
}: Props) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`${label}${selected ? " (selected)" : ""}`}
      className={[
        "focus-ring",
        "relative inline-flex items-center justify-center",
        "h-9 px-4 rounded-full",
        "text-[13.5px] leading-none whitespace-nowrap",
        "transition-[color,background-color,border-color,transform] duration-200 ease-out",
        "border",
        selected
          ? "bg-ink text-paper border-ink shadow-[0_1px_0_rgba(27,22,18,0.5)]"
          : "bg-paper/70 text-ash border-line hover:text-ink hover:border-line-strong hover:bg-paper",
        "active:scale-[0.98]",
        className,
      ].join(" ")}
      {...rest}
    >
      <span className="font-sans">{label}</span>
    </button>
  );
}
