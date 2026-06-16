"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { BILLING_INTERVALS, type BillingInterval } from "@/lib/options";

type Props = {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  /** Optional badge text shown on the annual option (e.g. "Save 25%"). */
  annualBadge?: string;
  className?: string;
};

const LABELS: Record<BillingInterval, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

/**
 * Segmented Monthly / Annual control with a sliding highlight that animates
 * between the two options. Shares the visual language of LanguagePill.
 */
export function BillingToggle({
  value,
  onChange,
  annualBadge,
  className = "",
}: Props) {
  const activeIndex = BILLING_INTERVALS.indexOf(value);

  // The highlight is sized and positioned to the *actual* active button rather
  // than a fixed 50%, so the pill hugs each option's content (the "Annual" side
  // is wider because of the savings badge) and the two states stay balanced.
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = buttonRefs.current[activeIndex];
    if (!el) return;
    const update = () =>
      setPill({ left: el.offsetLeft, width: el.offsetWidth });
    update();

    // Keep the highlight aligned across resizes and late font loads.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [activeIndex]);

  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className={[
        "relative inline-flex max-w-full p-1",
        "rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]",
        className,
      ].join(" ")}
    >
      {/* Sliding highlight — matched to the active button's box */}
      <span
        aria-hidden="true"
        className="
          absolute top-1 bottom-1 left-0
          rounded-full bg-[var(--theme-accent)]
          transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        "
        style={{
          width: pill ? `${pill.width}px` : "calc(50% - 0.25rem)",
          transform: `translateX(${pill ? pill.left : 4}px)`,
          opacity: pill ? 1 : 0,
        }}
      />

      {BILLING_INTERVALS.map((interval) => {
        const selected = value === interval;
        return (
          <button
            key={interval}
            ref={(el) => {
              buttonRefs.current[BILLING_INTERVALS.indexOf(interval)] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(interval)}
            className={[
              "focus-ring relative z-10",
              "inline-flex items-center justify-center gap-1.5",
              "h-9 rounded-full px-4",
              "font-sans text-[13.5px] leading-none",
              "transition-colors duration-200",
              selected ? "text-paper" : "text-ash hover:text-ink",
            ].join(" ")}
          >
            {LABELS[interval]}
            {interval === "annual" && annualBadge && (
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                  selected
                    ? "bg-paper/20 text-paper"
                    : "bg-white/60 text-ash",
                ].join(" ")}
              >
                {annualBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
