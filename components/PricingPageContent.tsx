"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { OneArticleMascotArt, OneNewsMascotArt } from "@/components/OneReadLineUp";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import {
  OFFERS,
  OFFER_KEYS,
  PRODUCT_ONE_ARTICLE,
  PRODUCT_ONE_NEWS,
  type BillingIntervalKey,
  type OfferKey,
  type ProductKey,
} from "@/lib/products/registry";
import {
  annualDiscountLabel,
  annualEquivalenceSentence,
  annualSavingClaim,
  intervalNoun,
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
 * Each column's CTA carries the offer and interval the column itself is
 * showing, so the plan a buyer chose is the plan the signup flow verifies and
 * the plan the checkout endpoint bills.
 *
 * Presentation follows the rest of the public site rather than a checkout
 * vendor's house style: the OneRead white page, the same header, the same
 * serif hierarchy, and the two product characters that introduce OneArticle
 * and OneNews everywhere else. The three offers are a comparison table drawn
 * in whitespace and hairlines — not cards — so the eye moves across one row of
 * prices instead of down three boxes.
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

        {/* One row of offers on desktop, one stack on a phone. The separators
            are hairlines rather than card edges, so the three read as columns
            of the same table and their prices sit on one line. */}
        <div className="mt-9 w-full animate-rise-delayed-3 sm:mt-11">
          <div className="grid grid-cols-1 divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0">
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
 * One offer as a column of the comparison.
 *
 * Every offer uses the same slots in the same order — character, name,
 * tagline, price, how annual is charged, what arrives and when, CTA — so a
 * buyer comparing three columns is comparing like with like. The bundle is
 * marked by a quiet tint and its contents line rather than a badge; we have no
 * data that would let us call it popular.
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
  const contents = offerContentsLine(offer);

  return (
    <article
      className={`flex h-full flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-9 ${
        isBundle ? "bg-cream/50" : ""
      }`}
    >
      <OfferMascots offer={offer} />

      <h2
        className={`mt-4 font-serif text-[1.3rem] leading-tight tracking-[-0.015em] text-ink sm:text-[1.4rem] ${
          isBundle ? "font-medium" : "font-normal"
        }`}
      >
        {OFFERS[offer].displayName}
      </h2>

      <p className="mt-1.5 min-h-[2.75rem] max-w-[26ch] font-sans text-[13px] leading-[1.6] text-ash sm:text-[13.5px]">
        {OFFERS[offer].tagline}
      </p>

      {/* The amount and the interval it is charged at, together. The annual
          column then states the charge before its monthly equivalent, so a
          yearly price can never read as a monthly one. */}
      <p className="mt-5 font-serif text-[2.4rem] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[2.6rem]">
        {offerAmountLabel(offer, interval)}
        <span className="font-sans text-[13px] font-normal tracking-normal text-ash">
          {" "}
          / {intervalNoun(interval)}
        </span>
      </p>

      <p className="mt-2 min-h-[2.5rem] max-w-[26ch] font-sans text-[12px] leading-[1.55] text-fog">
        {interval === "annual" ? annualEquivalenceSentence(offer) : null}
      </p>

      {/* What the offer contains, then when it arrives. The bundle spans two
          schedules, so its cadence names each product beside its own. */}
      <dl className="mt-4 mb-auto w-full max-w-[26ch] border-t border-line/80 pt-4 text-left">
        {contents && (
          <div className="mb-3">
            <dt className="font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">
              {includedLabel}
            </dt>
            <dd className="mt-1 font-sans text-[13px] leading-[1.55] text-ink">{contents}</dd>
          </div>
        )}
        <div>
          <dt className="font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">
            {cadenceLabel}
          </dt>
          <dd className="mt-1 font-sans text-[13px] leading-[1.55] text-ink">
            {offerCadenceLabel(offer)}
          </dd>
        </div>
      </dl>

      <Link
        href={`/subscribe?offer=${offer}&interval=${interval}`}
        onClick={() => trackEvent("offer_selected", { offer, interval })}
        className={`focus-ring mt-6 inline-flex h-12 shrink-0 w-full items-center justify-center rounded-full px-5 font-sans text-[14px] font-medium transition-colors duration-200 ${
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

/**
 * The characters that introduce an offer.
 *
 * Reuses the two drawings the homepage and the product pages already use.
 * OneRead has no character of its own — it is the bundle, so it is drawn as
 * the two products standing together rather than as a third figure. The art is
 * decorative here: each SVG already carries `aria-hidden`, and the offer is
 * named by the heading below it.
 */
function OfferMascots({ offer }: { offer: OfferKey }) {
  // Which characters an offer shows is not a decision this page makes: it is
  // whatever the offer grants. The bundle therefore draws two figures because
  // it grants two products, and would follow the registry if that changed.
  const granted = OFFERS[offer].grants;
  const size = granted.length > 1 ? "pair" : "solo";
  return (
    <div className="flex h-[4.5rem] items-end justify-center -space-x-4">
      {granted.map((product) => (
        <Mascot key={product} product={product} size={size}>
          {MASCOT_ART[product]}
        </Mascot>
      ))}
    </div>
  );
}

/** The canonical drawing for each product, reused rather than redrawn. */
const MASCOT_ART: Record<ProductKey, ReactNode> = {
  [PRODUCT_ONE_ARTICLE]: <OneArticleMascotArt />,
  [PRODUCT_ONE_NEWS]: <OneNewsMascotArt />,
};

/** The animation class each product's drawing is staged with. */
const MASCOT_THEME: Record<ProductKey, string> = {
  [PRODUCT_ONE_ARTICLE]: "product-mascot-article",
  [PRODUCT_ONE_NEWS]: "product-mascot-news",
};

/**
 * One drawing at the restrained size this page uses: large enough to identify
 * the product, small enough that the prices stay the loudest thing in the row.
 * The `product-mascot` classes carry the same idle gestures as the product
 * pages, and the same reduced-motion opt-out.
 */
function Mascot({
  product,
  size,
  children,
}: {
  product: ProductKey;
  size: "solo" | "pair";
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      className={`product-mascot ${MASCOT_THEME[product]} ${
        size === "pair" ? "h-[3.75rem] w-[3.75rem]" : "h-[4.5rem] w-[4.5rem]"
      }`}
    >
      <div className="product-mascot-art h-full w-full">{children}</div>
    </div>
  );
}
