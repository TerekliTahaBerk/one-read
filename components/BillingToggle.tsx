"use client";

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

  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className={[
        "relative inline-flex w-full max-w-[16rem] p-1",
        "rounded-full border border-line bg-cream/60",
        className,
      ].join(" ")}
    >
      {/* Sliding highlight */}
      <span
        aria-hidden="true"
        className="
          absolute top-1 bottom-1 left-1
          w-[calc(50%-0.25rem)]
          rounded-full bg-ink
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        "
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />

      {BILLING_INTERVALS.map((interval) => {
        const selected = value === interval;
        return (
          <button
            key={interval}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(interval)}
            className={[
              "focus-ring relative z-10 flex-1",
              "inline-flex items-center justify-center gap-1.5",
              "h-9 rounded-full",
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
                    : "bg-ink/5 text-ash",
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
