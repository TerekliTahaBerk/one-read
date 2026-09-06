"use client";

import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import {
  OFFERS,
  OFFER_KEYS,
  annualDiscountPercent,
  uniformAnnualDiscountPercent,
  type BillingIntervalKey,
} from "@/lib/products/registry";
import { trackEvent } from "@/lib/analytics";

export function PricingPageContent() {
  const [interval, setInterval] = useState<BillingIntervalKey>("annual");
  // Every price and every claim about them comes from the offer registry. If
  // the offers ever stop sharing one discount, the headline becomes "up to"
  // rather than stating a flat percentage that is untrue of some of them.
  const uniformDiscount = uniformAnnualDiscountPercent();
  const discountLabel =
    uniformDiscount !== null
      ? `save ${uniformDiscount}%`
      : `save up to ${Math.max(...OFFER_KEYS.map(annualDiscountPercent))}%`;
  return <main className="min-h-svh bg-[#f6f5f1] px-5 py-7 text-ink sm:px-6 sm:py-9">
    <header className="relative flex justify-center"><BackButton href="/" label="Back to OneRead" /><Logo href="/" /></header>
    <section className="mx-auto flex max-w-5xl flex-col items-center py-12">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-fog">Simple pricing · USD</p>
      <h1 className="mt-3 max-w-2xl text-center font-serif text-4xl font-medium sm:text-5xl">Choose one. Or get both.</h1>
      <p className="mt-4 max-w-xl text-center text-ash">{`Annual billing ${discountLabel.replace("save", "saves")} and is selected by default.`} Monthly billing stays available. No trial—the full samples are open.</p>
      <fieldset className="my-8 flex rounded-full bg-white p-1"><legend className="sr-only">Billing interval</legend>{(["annual", "monthly"] as const).map((item) => <button key={item} type="button" aria-pressed={interval === item} onClick={() => { setInterval(item); trackEvent("billing_interval_selected", { interval: item }); }} className={`focus-ring min-h-11 rounded-full px-6 text-sm ${interval === item ? "bg-ink text-white" : "text-ash"}`}>{item === "annual" ? `Annual · ${discountLabel}` : "Monthly"}</button>)}</fieldset>
      <div className="grid w-full gap-4 md:grid-cols-3">{OFFER_KEYS.map((offer) => {
        const amount = OFFERS[offer].prices[interval].amountUsd;
        return <article key={offer} className={`flex flex-col rounded-2xl border bg-white p-6 ${offer === "one-read" ? "border-ink ring-1 ring-ink" : "border-black/15"}`}>
          <h2 className="font-serif text-2xl">{OFFERS[offer].displayName}</h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-ash">{OFFERS[offer].tagline}</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-fog">{OFFERS[offer].cadence}</p>
          <p className="mt-5 text-3xl font-semibold">${amount}<span className="text-sm font-normal text-ash"> / {interval === "annual" ? "year" : "month"}</span></p>
          <Link href={`/subscribe?offer=${offer}&interval=${interval}`} onClick={() => trackEvent("offer_selected", { offer, interval })} className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-white">Choose {OFFERS[offer].displayName}</Link>
        </article>;
      })}</div>
      <p className="mt-8 text-center text-sm text-ash">Billed securely by Polar. Cancel anytime through the billing portal. Email preferences are separate from billing.</p>
    </section><Footer showBackHome /></main>;
}
