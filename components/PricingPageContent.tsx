"use client";

import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import {
  OFFERS,
  OFFER_KEYS,
  type BillingIntervalKey,
} from "@/lib/products/registry";
import {
  annualDiscountLabel,
  annualEquivalenceSentence,
  annualSavingClaim,
  offerCadenceLabel,
  offerContentsLine,
  offerAmountLabel,
} from "@/lib/products/pricing-copy";
import { BUNDLE_OFFER_KEY } from "@/lib/products/terminology";
import { trackEvent } from "@/lib/analytics";

/**
 * The pricing page. Every name, price, cadence, discount, and "what's included"
 * line is derived: names and grants from the terminology contract, amounts and
 * percentages from the offer registry through `pricing-copy`. Nothing on this
 * page may be typed as a literal, because this is the last screen a buyer reads
 * before the checkout that charges them.
 *
 * Each card's CTA carries the offer and interval the card itself is showing, so
 * the plan a buyer chose is the plan the signup flow verifies and the plan the
 * checkout endpoint bills.
 */
export function PricingPageContent() {
  const [interval, setInterval] = useState<BillingIntervalKey>("annual");
  const discountLabel = annualDiscountLabel();
  return <main className="min-h-svh bg-[#f6f5f1] px-5 py-7 text-ink sm:px-6 sm:py-9">
    <header className="relative flex justify-center"><BackButton href="/" label="Back to OneRead" /><Logo href="/" /></header>
    <section className="mx-auto flex max-w-5xl flex-col items-center py-12">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-fog">Simple pricing · USD</p>
      <h1 className="mt-3 max-w-2xl text-center font-serif text-4xl font-medium sm:text-5xl">Choose one product, or both.</h1>
      <p className="mt-4 max-w-xl text-center text-ash">{`Annual billing ${annualSavingClaim()} and is selected by default; it is charged once a year, not monthly.`} Monthly billing stays available. No trial—the full samples are open.</p>
      <fieldset className="my-8 flex rounded-full bg-white p-1"><legend className="sr-only">Billing interval</legend>{(["annual", "monthly"] as const).map((item) => <button key={item} type="button" aria-pressed={interval === item} onClick={() => { setInterval(item); trackEvent("billing_interval_selected", { interval: item }); }} className={`focus-ring min-h-11 rounded-full px-6 text-sm ${interval === item ? "bg-ink text-white" : "text-ash"}`}>{item === "annual" ? `Annual · ${discountLabel}` : "Monthly"}</button>)}</fieldset>
      <div className="grid w-full gap-4 md:grid-cols-3">{OFFER_KEYS.map((offer) => (
        <article key={offer} className={`flex flex-col rounded-2xl border bg-white p-6 ${offer === BUNDLE_OFFER_KEY ? "border-ink ring-1 ring-ink" : "border-black/15"}`}>
          <h2 className="font-serif text-2xl">{OFFERS[offer].displayName}</h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-ash">{OFFERS[offer].tagline}</p>
          {/* What the bundle contains, then when everything arrives. The
              bundle spans two schedules, so it names each product beside its
              own cadence instead of implying one shared delivery day. */}
          {offerContentsLine(offer) && <p className="mt-4 text-sm leading-6 text-ink">{offerContentsLine(offer)}</p>}
          <p className="mt-4 text-xs font-semibold tracking-wide text-fog">{offerCadenceLabel(offer)}</p>
          <p className="mt-5 text-3xl font-semibold">{offerAmountLabel(offer, interval)}<span className="text-sm font-normal text-ash"> / {interval === "annual" ? "year" : "month"}</span></p>
          {interval === "annual" && <p className="mt-1 text-xs leading-5 text-ash">{annualEquivalenceSentence(offer)}</p>}
          <Link href={`/subscribe?offer=${offer}&interval=${interval}`} onClick={() => trackEvent("offer_selected", { offer, interval })} className="focus-ring mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-white">Choose {OFFERS[offer].displayName}</Link>
        </article>
      ))}</div>
      <p className="mt-8 text-center text-sm text-ash">Billed securely by Polar. Cancel anytime through the billing portal. Email preferences are separate from billing.</p>
    </section><Footer showBackHome /></main>;
}
