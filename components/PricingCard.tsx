"use client";

import Link from "next/link";
import { useState } from "react";
import { BillingToggle } from "./BillingToggle";
import {
  FEATURES,
  PRICING,
  type BillingInterval,
} from "@/lib/options";

/**
 * Interactive pricing card. Lives inside the (server) pricing page so the page
 * can keep its metadata. The Monthly/Annual toggle animates the price and the
 * supporting line, and the full feature list is rendered from lib/options.
 */
export function PricingCard() {
  const [interval, setInterval] = useState<BillingInterval>("annual");

  const isAnnual = interval === "annual";
  const price = isAnnual ? PRICING.annual : PRICING.monthly;
  const period = isAnnual ? "per year" : "per month";
  return (
    <div
      className="
        group relative w-full max-w-[25rem] mt-8 sm:mt-9
        animate-rise-delayed-3
      "
    >
      <div className="relative">
        <div className="px-1 py-0 text-center">
          {/* Toggle */}
          <div className="flex justify-center">
            <BillingToggle
              value={interval}
              onChange={setInterval}
              annualBadge={`Save ${PRICING.annualSavingsPct}%`}
            />
          </div>

          {/* Animated price — keyed so it re-mounts and fades on interval change */}
          <div key={interval} className="mt-7 animate-fade-in" aria-live="polite">
            <div className="flex items-end justify-center gap-1.5">
              <span className="font-serif font-medium text-[1.5rem] leading-none text-ash translate-y-[-0.55rem]">
                $
              </span>
              <span className="font-serif font-medium text-[3.5rem] leading-[0.85] tracking-[-0.02em] text-ink tabular-nums">
                {price}
              </span>
              <span className="font-sans text-[13.5px] text-ash pb-1.5">
                {period}
              </span>
            </div>

            <p className="mt-3 font-serif italic text-[13.5px] leading-snug text-ash">
              {isAnnual ? (
                <>Save {PRICING.annualSavingsPct}% with annual billing.</>
              ) : (
                <>
                  Go annual for{" "}
                  <span className="text-ink not-italic font-sans font-medium tabular-nums">
                    ${PRICING.annual}
                  </span>{" "}
                  and save {PRICING.annualSavingsPct}%.
                </>
              )}
            </p>
          </div>

          {/* Divider */}
          <div className="mt-7 h-px w-full bg-[var(--theme-border)]" aria-hidden="true" />

          {/* Feature list */}
          <ul className="mt-6 space-y-3 text-left">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 font-sans text-[14px] leading-snug text-graphite"
              >
                <span
                  aria-hidden="true"
                  className="
                    mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center
                    rounded-full bg-[var(--theme-surface)] text-[var(--theme-accent)]
                  "
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                    <path
                      d="M5 12.5l4.2 4.2L19 7"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/article"
            className="
              focus-ring group/cta
              mt-8 inline-flex w-full h-12 items-center justify-center gap-2
              rounded-xl bg-[var(--theme-accent)] text-paper
              font-sans text-[15px] tracking-tight
              transition-[transform,background-color,opacity] duration-200
              hover:brightness-95
              active:scale-[0.99]
            "
          >
            Start 7-day free trial
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
            >
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          {/* Trust notes */}
          <div className="mt-4 space-y-1.5">
            <p className="font-sans text-[12.5px] text-ash">
              7-day free trial included. Cancel anytime.
            </p>
            <p className="font-sans text-[12.5px] text-fog">
              No app. No feed. One useful read every morning.
            </p>
            <p className="font-sans text-[12.5px] text-fog">
              Trial and billing are handled securely by Polar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
