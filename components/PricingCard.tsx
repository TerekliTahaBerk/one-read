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
  const period = isAnnual ? "/ year" : "/ month";

  return (
    <div
      className="
        w-full max-w-[24rem] mt-9 sm:mt-10
        rounded-2xl border border-line bg-paper/60
        px-6 py-7 sm:px-7 sm:py-8
        text-center
        animate-rise-delayed-3
      "
    >
      <p className="text-[11px] font-sans uppercase tracking-eyebrow text-fog">
        One Read
      </p>

      {/* Toggle */}
      <div className="mt-4 flex justify-center">
        <BillingToggle
          value={interval}
          onChange={setInterval}
          annualBadge={`Save ${PRICING.annualSavingsPct}%`}
        />
      </div>

      {/* Animated price — keyed so it re-mounts and fades on interval change */}
      <div
        key={interval}
        className="mt-5 animate-fade-in"
        aria-live="polite"
      >
        <div className="flex items-baseline justify-center gap-1">
          <span className="font-serif font-medium text-[2.75rem] leading-none text-ink">
            ${price}
          </span>
          <span className="font-sans text-[14px] text-ash">{period}</span>
        </div>
        <p className="mt-2 font-serif italic text-[13px] text-ash">
          {isAnnual
            ? `That's $${(PRICING.annual / 12).toFixed(2)} a month — save ${PRICING.annualSavingsPct}%.`
            : `Or $${PRICING.annual} a year and save ${PRICING.annualSavingsPct}%.`}
        </p>
      </div>

      <ul className="mt-6 space-y-2.5 text-left">
        {FEATURES.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 font-sans text-[14px] text-graphite"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              aria-hidden="true"
              className="mt-0.5 shrink-0"
            >
              <path
                d="M5 12.5l4.2 4.2L19 7"
                stroke="#1A1A1A"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="
          focus-ring
          mt-7 inline-flex w-full h-12 items-center justify-center gap-2
          rounded-xl bg-ink text-paper
          font-sans text-[15px] tracking-tight
          transition-[transform,background-color] duration-200
          hover:bg-graphite active:scale-[0.99]
        "
      >
        Start with One Read
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M2 7h10M8 3l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
    </div>
  );
}
