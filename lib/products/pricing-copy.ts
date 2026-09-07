/**
 * The public pricing and cadence language, derived from the registry.
 *
 * `registry.ts` owns what we sell and what it costs. `terminology.ts` owns what
 * the things are called. This module owns the third thing each acquisition
 * surface used to answer for itself: *how a price, a cadence, and a bundle are
 * phrased to a buyer*.
 *
 * It exists because those phrasings had drifted apart. The homepage sold
 * "OneArticle from $18/year" as three literal digits in JSX; the signup flow
 * promised "Annual · save 25%" in a hardcoded string beside a pricing page that
 * derived the same percentage; the pricing metadata restated all six prices in
 * prose; and the offer registry described the bundle's cadence as "Both
 * editorial products", which is not a cadence. Any price change would have left
 * some of those behind, and the surface that lagged would have been the one a
 * buyer read before paying.
 *
 * Two rules hold everything here together:
 *
 *   1. No number is written down. Every amount, percentage, and per-month
 *      equivalent is computed from `OFFERS`.
 *   2. No claim outruns its arithmetic. A monthly equivalent that does not
 *      divide exactly into cents is labelled as approximate, and an annual
 *      price is never described in a way that implies it is charged monthly.
 */

import {
  OFFERS,
  OFFER_KEYS,
  PRODUCTS,
  annualDiscountPercent,
  annualSavingUsd,
  uniformAnnualDiscountPercent,
  type BillingIntervalKey,
  type OfferKey,
  type ProductKey,
} from "./registry";
import { BUNDLE_OFFER_KEY, isBundleOffer, offerIncludesLabel } from "./terminology";

/* -------------------------------- amounts -------------------------------- */

/**
 * A USD amount as copy. Whole dollars stay whole ("$18"); anything else keeps
 * two decimals ("$1.50"), because a price shown to a buyer is never rounded to
 * a figure they will not be charged.
 */
export function formatUsd(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `$${rounded}` : `$${rounded.toFixed(2)}`;
}

/** The noun a billing interval is charged in. */
export function intervalNoun(interval: BillingIntervalKey): "year" | "month" {
  return interval === "annual" ? "year" : "month";
}

/** Just the amount an offer costs at an interval — "$18". */
export function offerAmountLabel(offer: OfferKey, interval: BillingIntervalKey): string {
  return formatUsd(OFFERS[offer].prices[interval].amountUsd);
}

/** An offer's price at an interval — "$18 / year". */
export function offerPriceLabel(offer: OfferKey, interval: BillingIntervalKey): string {
  return `${formatUsd(OFFERS[offer].prices[interval].amountUsd)} / ${intervalNoun(interval)}`;
}

/** The same amount stated in full, for a review screen — "$18 USD / year". */
export function offerPriceSentence(offer: OfferKey, interval: BillingIntervalKey): string {
  return `${formatUsd(OFFERS[offer].prices[interval].amountUsd)} USD / ${intervalNoun(interval)}`;
}

/* -------------------------- the annual equivalent ------------------------ */

export interface MonthlyEquivalent {
  /** The annual price divided by twelve, unrounded. */
  amountUsd: number;
  /** Whether that division lands exactly on a cent. */
  exact: boolean;
}

/**
 * What an annual price works out to per month.
 *
 * `exact` is the honest part. $18/year is $1.50 a month and may be stated as a
 * fact; a price that divides into a fraction of a cent may only ever be stated
 * as "about", because twelve of the rounded figure is not the price charged.
 */
export function monthlyEquivalent(offer: OfferKey): MonthlyEquivalent {
  const annual = OFFERS[offer].prices.annual.amountUsd;
  const perMonth = annual / 12;
  return { amountUsd: perMonth, exact: Math.abs(perMonth * 100 - Math.round(perMonth * 100)) < 1e-9 };
}

/**
 * The annual price and its monthly equivalent in one sentence.
 *
 * Always names the charge before the equivalent — "$36 billed once a year —
 * $3 a month" — so the per-month figure can never be mistaken for a monthly
 * charge. This is the claim the requirement calls mathematically clear:
 * the buyer is told both the amount that leaves their account and the interval
 * at which it does.
 */
export function annualEquivalenceSentence(offer: OfferKey): string {
  const annual = OFFERS[offer].prices.annual.amountUsd;
  const { amountUsd, exact } = monthlyEquivalent(offer);
  const perMonth = formatUsd(amountUsd);
  return `${formatUsd(annual)} billed once a year — ${exact ? "" : "about "}${perMonth} a month.`;
}

/* -------------------------------- discount ------------------------------- */

/**
 * The annual discount as a claim we can defend.
 *
 * A flat "save 25%" is only permitted while every offer discounts by the same
 * amount; the moment they diverge the claim becomes "up to", because a single
 * percentage would be untrue of at least one card on the same page.
 */
export function annualDiscountLabel(): string {
  const uniform = uniformAnnualDiscountPercent();
  return uniform !== null
    ? `save ${uniform}%`
    : `save up to ${Math.max(...OFFER_KEYS.map(annualDiscountPercent))}%`;
}

/** The same claim as a statement rather than an imperative. */
export function annualSavingClaim(): string {
  return annualDiscountLabel().replace(/^save/, "saves");
}

/** What annual billing saves on one offer, in money rather than percent. */
export function annualSavingSentence(offer: OfferKey): string {
  const saving = annualSavingUsd(offer);
  if (saving <= 0) return "";
  return `Saves ${formatUsd(saving)} against twelve months at ${formatUsd(
    OFFERS[offer].prices.monthly.amountUsd,
  )}.`;
}

/* -------------------------------- cadence -------------------------------- */

export interface ProductCadence {
  product: ProductKey;
  displayName: string;
  cadence: string;
}

/**
 * The delivery cadence of everything an offer grants.
 *
 * The bundle has two cadences and no single one of them is true of it, so this
 * returns a list rather than a string and lets each surface decide how much
 * room it has. Nothing here invents a cadence for an offer: they belong to
 * products, and are read from the product registry.
 */
export function offerCadences(offer: OfferKey): readonly ProductCadence[] {
  return OFFERS[offer].grants.map((product) => ({
    product,
    displayName: PRODUCTS[product].displayName,
    cadence: PRODUCTS[product].cadence,
  }));
}

/**
 * One line of cadence for an offer. A standalone offer states when it arrives;
 * the bundle names each product beside its own cadence, so "Mon / Wed / Fri"
 * can never appear to describe the weekday product.
 */
export function offerCadenceLabel(offer: OfferKey): string {
  const cadences = offerCadences(offer);
  if (cadences.length === 1) return cadences[0].cadence;
  return cadences.map((entry) => `${entry.displayName}: ${entry.cadence}`).join(" · ");
}

/* ------------------------------ what you get ----------------------------- */

/**
 * What an offer contains, as a sentence.
 *
 * Every offer gets the same sentence in the same slot, so a buyer comparing
 * cards is comparing like with like and the bundle's contents are stated rather
 * than left to be inferred from the word "both" in its tagline.
 */
export function offerIncludesSentence(offer: OfferKey): string {
  return `Includes ${offerIncludesLabel(offer, " and ")}.`;
}

/**
 * The contents line a card should render, or null when there is nothing to add.
 *
 * A standalone offer's contents are its own title, so restating them under it
 * says nothing. The bundle's are not, and are the one thing a buyer must be
 * told before choosing it — so that is where the line appears.
 */
export function offerContentsLine(offer: OfferKey): string | null {
  return isBundleOffer(offer) ? offerIncludesSentence(offer) : null;
}

/* --------------------------- whole-surface copy -------------------------- */

/**
 * The homepage's price line: the cheapest way into each offer, in offer order,
 * with the bundle naming what it bundles.
 */
export function entryPriceLine(): string {
  return OFFER_KEYS.map((offer) => {
    const price = `${formatUsd(OFFERS[offer].prices.annual.amountUsd)}/year`;
    return isBundleOffer(offer)
      ? `${OFFERS[offer].displayName} (${offerIncludesLabel(offer)}) ${price}`
      : `${OFFERS[offer].displayName} ${price}`;
  }).join(" · ");
}

/**
 * Every price in prose, for a page description. Search results and link
 * previews are a commercial surface too, and this is the one place they are
 * allowed to state a price.
 */
export function pricingSummarySentence(): string {
  const perOffer = OFFER_KEYS.map((offer) => {
    const { monthly, annual } = OFFERS[offer].prices;
    return `${OFFERS[offer].displayName} is ${formatUsd(monthly.amountUsd)} monthly or ${formatUsd(
      annual.amountUsd,
    )} annually`;
  });
  return `${perOffer.join(". ")}. ${OFFERS[BUNDLE_OFFER_KEY].displayName} includes ${offerIncludesLabel(
    BUNDLE_OFFER_KEY,
    " and ",
  )}.`;
}
