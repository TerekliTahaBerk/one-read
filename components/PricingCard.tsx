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
  // The effective monthly cost, used to show the annual saving honestly.
  const monthlyEquivalent = (PRICING.annual / 12).toFixed(2);

  return (
    <div
      className="
        group relative w-full max-w-[25rem] mt-9 sm:mt-10
        animate-rise-delayed-3
      "
    >
      {/* Soft ambient halo behind the card */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute -inset-px -z-10
          rounded-[1.6rem]
          bg-gradient-to-b from-line/70 via-line/30 to-transparent
        "
      />

      <div
        className="
          relative overflow-hidden
          rounded-[1.5rem] border border-line bg-paper
          shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-12px_rgba(0,0,0,0.10)]
        "
      >
        {/* Hairline accent rule along the very top of the card */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent"
        />

        <div className="px-6 py-7 sm:px-8 sm:py-9 text-center">
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
                <>
                  Just{" "}
                  <span className="text-ink not-italic font-sans font-medium tabular-nums">
                    ${monthlyEquivalent}
                  </span>{" "}
                  a month, billed yearly.
                </>
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
          <div className="mt-7 h-px w-full bg-line" aria-hidden="true" />

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
                    rounded-full bg-ink/[0.06]
                  "
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none">
                    <path
                      d="M5 12.5l4.2 4.2L19 7"
                      stroke="#1A1A1A"
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
            href="/"
            className="
              focus-ring group/cta
              mt-8 inline-flex w-full h-12 items-center justify-center gap-2
              rounded-xl bg-ink text-paper
              font-sans text-[15px] tracking-tight
              shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]
              transition-[transform,background-color,box-shadow] duration-200
              hover:bg-graphite hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.55)]
              active:scale-[0.99]
            "
          >
            Start with One Read
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

          {/* Reassurance line */}
          <p className="mt-4 font-sans text-[12.5px] text-fog">
            Secure checkout · Start reading tomorrow morning.
          </p>
        </div>
      </div>
    </div>
  );
}
