"use client";

import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import {
  OFFER_ROW_CLASS,
  OfferSummary,
  offerColumnClass,
} from "@/components/OfferSummary";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import {
  OFFERS,
  OFFER_KEYS,
  type BillingIntervalKey,
  type OfferKey,
} from "@/lib/products/registry";
import { annualDiscountLabel, annualSavingClaim } from "@/lib/products/pricing-copy";
import { BUNDLE_OFFER_KEY } from "@/lib/products/terminology";
import { trackEvent } from "@/lib/analytics";

/**
 * The pricing page. Every name, price, cadence, discount, and "what's included"
 * line is derived: names and grants from the terminology contract, amounts and
 * percentages from the offer registry through `pricing-copy`. Nothing on this
 * page may be typed as a literal, because this is the last screen a buyer reads
 * before the checkout that charges them.
 *
 * Each column's CTA carries the offer and interval the column itself is
 * showing, so the plan a buyer chose is the plan the signup flow verifies and
 * the plan the checkout endpoint bills.
 *
 * Presentation follows the rest of the public site rather than a checkout
 * vendor's house style: the OneRead white page, the same header, the same
 * serif hierarchy, and the two product characters that introduce OneArticle
 * and OneNews everywhere else. The three offers are a comparison table drawn
 * in whitespace and hairlines — not cards — so the eye moves across one row of
 * prices instead of down three boxes. The columns themselves come from
 * `OfferSummary`, which the signup flow renders too.
 */
export function PricingPageContent() {
  const [interval, setInterval] = useState<BillingIntervalKey>("annual");
  const { dictionary } = useSiteLanguage();
  const copy = dictionary.pricing;
  const discountLabel = annualDiscountLabel();

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
      "
    >
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo href="/" />
      </header>

      <section className="mx-auto flex w-full max-w-[62rem] flex-1 flex-col items-center py-8 sm:py-10">
        <p className="font-sans text-[11px] uppercase tracking-eyebrow text-fog animate-rise-delayed">
          {copy.eyebrow}
        </p>

        <h1
          className="
            mt-3 max-w-[18ch]
            font-serif font-medium
            text-[2.25rem] leading-[1.04]
            sm:text-[3.1rem] sm:leading-[1]
            tracking-[-0.026em]
            text-ink text-center text-balance
            animate-rise-delayed
          "
        >
          {copy.title}
        </h1>

        {/* The commercial explanation a buyer needs before choosing an
            interval: what annual costs relative to monthly, that it is charged
            once, and that nothing here is a trial. The saving is derived. */}
        <p className="mt-4 max-w-[52ch] text-center font-sans text-[14.5px] leading-[1.65] text-ash text-pretty sm:text-[15.5px] animate-rise-delayed-2">
          {copy.intro.replace("{saving}", annualSavingClaim())}
        </p>

        <fieldset className="mt-7 flex flex-col items-center animate-rise-delayed-2 sm:mt-8">
          <legend className="sr-only">{copy.billingLegend}</legend>
          <div className="flex rounded-full border border-line p-1">
            {(["annual", "monthly"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={interval === item}
                onClick={() => {
                  setInterval(item);
                  trackEvent("billing_interval_selected", { interval: item });
                }}
                className={`focus-ring min-h-11 rounded-full px-5 font-sans text-[13.5px] transition-colors duration-200 sm:px-6 ${
                  interval === item ? "bg-ink text-paper" : "text-ash hover:text-ink"
                }`}
              >
                {item === "annual" ? `${copy.annual} · ${discountLabel}` : copy.monthly}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-9 w-full animate-rise-delayed-3 sm:mt-11">
          <div className={OFFER_ROW_CLASS}>
            {OFFER_KEYS.map((offer) => (
              <PricingOfferColumn
                key={offer}
                offer={offer}
                interval={interval}
                includedLabel={copy.includedLabel}
                cadenceLabel={copy.cadenceLabel}
                chooseLabel={copy.choose.replace("{name}", OFFERS[offer].displayName)}
              />
            ))}
          </div>
        </div>

        <p className="mt-7 max-w-[52ch] text-center font-sans text-[13px] leading-[1.7] text-ash animate-rise-delayed-4 sm:mt-8">
          {copy.trust}
        </p>
      </section>

      <Footer showBackHome />
    </main>
  );
}

/**
 * One offer as a column of the comparison, with the link that buys it.
 *
 * The bundle is marked by a quiet tint and its contents line rather than a
 * badge; we have no data that would let us call it popular.
 */
function PricingOfferColumn({
  offer,
  interval,
  includedLabel,
  cadenceLabel,
  chooseLabel,
}: {
  offer: OfferKey;
  interval: BillingIntervalKey;
  includedLabel: string;
  cadenceLabel: string;
  chooseLabel: string;
}) {
  const isBundle = offer === BUNDLE_OFFER_KEY;

  return (
    <article className={offerColumnClass(isBundle)}>
      <OfferSummary
        offer={offer}
        interval={interval}
        nameAs="h2"
        includedLabel={includedLabel}
        cadenceLabel={cadenceLabel}
        emphasised={isBundle}
      />

      <Link
        href={`/subscribe?offer=${offer}&interval=${interval}`}
        onClick={() => trackEvent("offer_selected", { offer, interval })}
        className={`focus-ring mt-6 inline-flex h-12 w-full shrink-0 items-center justify-center rounded-full px-5 font-sans text-[14px] font-medium transition-colors duration-200 ${
          isBundle
            ? "bg-ink text-paper hover:bg-ink/90"
            : "border border-line-strong text-ink hover:border-ink"
        }`}
      >
        {chooseLabel}
      </Link>
    </article>
  );
}
