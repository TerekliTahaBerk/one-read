"use client";

import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { trackEvent } from "@/lib/analytics";
import { OFFERS, OFFER_KEYS, type BillingIntervalKey, type OfferKey } from "@/lib/products/registry";

const planDetails: Record<OfferKey, { distinction: string; cadence: string }> = {
  "one-article": { distinction: "Something worth reading.", cadence: "Weekday mornings" },
  "one-news": { distinction: "Something worth understanding.", cadence: "Monday, Wednesday, Friday" },
  "one-read": { distinction: "Both.", cadence: "OneArticle + OneNews" },
};

export function PricingPageContent() {
  const [interval, setInterval] = useState<BillingIntervalKey>("annual");

  return (
    <main className="flex min-h-svh flex-col bg-white px-5 pb-4 pt-5 text-ink sm:px-6 sm:pb-5 sm:pt-6">
      <header className="relative flex w-full justify-center">
        <BackButton href="/" label="Back to OneRead" />
        <Logo href="/" />
      </header>

      <section className="mx-auto flex w-full max-w-[58rem] flex-1 flex-col items-center py-10 sm:py-14">
        <h1 className="max-w-[16ch] text-balance text-center font-serif text-[2.45rem] font-medium leading-[1.02] tracking-[-0.026em] text-ink sm:text-[3.55rem] sm:leading-[0.99]">
          Choose one. Or get both.
        </h1>
        <p className="mt-4 max-w-[48ch] text-pretty text-center font-sans text-[15px] leading-[1.65] text-ash sm:mt-5 sm:text-[16px]">
          Two calm editorial products, each with a clear purpose. Annual billing saves 25%; monthly billing stays available.
        </p>

        <BillingInterval value={interval} onChange={setInterval} />

        <div className="mt-10 grid w-full gap-4 border-t border-line/80 pt-10 md:grid-cols-3">
          {OFFER_KEYS.map((offer) => <Plan key={offer} offer={offer} interval={interval} />)}
        </div>

        <div className="mt-10 w-full border-t border-line/80 pt-8 text-center">
          <p className="mx-auto max-w-[56ch] font-sans text-[13px] leading-[1.7] text-ash">
            No trial. Read the full samples first. Billing is handled securely by Polar, and you can cancel anytime through the billing portal. Email preferences stay separate from billing.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 font-sans text-[13px] text-ink">
            <Link href="/samples/article" className="focus-ring link-underline rounded-sm">Read a OneArticle sample</Link>
            <Link href="/samples/news" className="focus-ring link-underline rounded-sm">Read a OneNews sample</Link>
          </div>
        </div>
      </section>

      <Footer showBackHome />
    </main>
  );
}

function BillingInterval({ value, onChange }: { value: BillingIntervalKey; onChange: (value: BillingIntervalKey) => void }) {
  return (
    <fieldset className="mt-8 flex rounded-full border border-line-strong bg-white p-1">
      <legend className="sr-only">Billing interval</legend>
      {(["annual", "monthly"] as const).map((item) => {
        const selected = value === item;
        return (
          <button
            key={item}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              onChange(item);
              trackEvent("billing_interval_selected", { interval: item });
            }}
            className={`focus-ring min-h-11 rounded-full px-5 font-sans text-[13px] font-medium transition-colors sm:px-6 ${selected ? "bg-ink text-white" : "text-ash hover:text-ink"}`}
          >
            {item === "annual" ? "Annual · save 25%" : "Monthly"}
          </button>
        );
      })}
    </fieldset>
  );
}

function Plan({ offer, interval }: { offer: OfferKey; interval: BillingIntervalKey }) {
  const definition = OFFERS[offer];
  const detail = planDetails[offer];
  const featured = offer === "one-read";
  const amount = definition.prices[interval].amountUsd;

  return (
    <article className={`flex min-w-0 flex-col border-t px-1 pb-1 pt-6 ${featured ? "border-ink" : "border-line-strong"}`}>
      <p className="font-sans text-[10.5px] font-semibold uppercase tracking-eyebrow text-fog">
        {detail.distinction}{featured ? " · Best value" : ""}
      </p>
      <h2 className="mt-2 font-serif text-[1.65rem] font-medium text-ink">{definition.displayName}</h2>
      <p className="mt-3 min-h-[3.25rem] font-sans text-[13.5px] leading-[1.65] text-ash">{definition.tagline}</p>
      <p className="mt-4 font-sans text-[12.5px] font-medium text-ink">{detail.cadence}</p>
      <p className="mt-5 font-serif text-[2.45rem] font-medium leading-none tracking-[-0.025em] text-ink">
        ${amount}<span className="ml-1 font-sans text-[13px] font-normal tracking-normal text-ash">/ {interval === "annual" ? "year" : "month"}</span>
      </p>
      <Link
        href={`/subscribe?offer=${offer}&interval=${interval}`}
        onClick={() => trackEvent("offer_selected", { offer, interval })}
        className={`focus-ring mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 font-sans text-[14px] font-medium transition-colors ${featured ? "bg-ink text-white hover:bg-ink/90" : "border border-line-strong bg-white/70 text-ink hover:bg-white"}`}
      >
        Choose {definition.displayName}
      </Link>
    </article>
  );
}
