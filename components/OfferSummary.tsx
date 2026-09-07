"use client";

import type { ReactNode } from "react";
import { OneArticleMascotArt, OneNewsMascotArt } from "@/components/OneReadLineUp";
import {
  OFFERS,
  PRODUCT_ONE_ARTICLE,
  PRODUCT_ONE_NEWS,
  type BillingIntervalKey,
  type OfferKey,
  type ProductKey,
} from "@/lib/products/registry";
import {
  annualEquivalenceSentence,
  intervalNoun,
  offerCadenceLabel,
  offerContentsLine,
  offerAmountLabel,
} from "@/lib/products/pricing-copy";

/**
 * One offer, described the same way everywhere a buyer compares offers.
 *
 * This exists because the pricing page and the signup flow had each drawn the
 * same three offers in their own markup, and a redesign of one left the other
 * showing the old one — which is exactly what a buyer notices when they click
 * "Choose your plan" and land on a screen that looks like a different site.
 * Both surfaces now render this, so the comparison a buyer reads on /pricing
 * is the comparison they choose from on /subscribe.
 *
 * Everything stated here is derived: names, taglines and grants from the offer
 * registry, amounts and cadences through `pricing-copy`. Nothing is a literal.
 *
 * The markup is deliberately phrasing-level (`<span className="block">` rather
 * than `<p>`/`<dl>`), because the signup flow wraps each column in a
 * `role="radio"` button, and flow content inside a button is invalid HTML. The
 * offer's name is the one exception: the pricing page needs a real heading, so
 * the element is chosen by the caller.
 */
export function OfferSummary({
  offer,
  interval,
  nameAs = "span",
  includedLabel,
  cadenceLabel,
  emphasised = false,
  showPrice = true,
}: {
  offer: OfferKey;
  interval: BillingIntervalKey;
  /** `h2` where the offer is a section of the page, `span` inside a control. */
  nameAs?: "h2" | "span";
  includedLabel: string;
  cadenceLabel: string;
  /** Slightly stronger name weight. Used for the bundle. */
  emphasised?: boolean;
  /**
   * Whether this summary states the price. The review step turns it off
   * because it states the same charge in full, in USD, right below — and a
   * buyer confirming a subscription should read one price, not two.
   */
  showPrice?: boolean;
}) {
  const Name = nameAs;
  const contents = offerContentsLine(offer);

  return (
    <>
      <OfferMascots offer={offer} />

      <Name
        className={`mt-4 font-serif text-[1.3rem] leading-tight tracking-[-0.015em] text-ink sm:text-[1.4rem] ${
          nameAs === "span" ? "block" : ""
        } ${emphasised ? "font-medium" : "font-normal"}`}
      >
        {OFFERS[offer].displayName}
      </Name>

      <span className="mt-1.5 block min-h-[2.75rem] max-w-[26ch] font-sans text-[13px] leading-[1.6] text-ash sm:text-[13.5px]">
        {OFFERS[offer].tagline}
      </span>

      {/* The amount and the interval it is charged at, together. The annual
          case then states the charge before its monthly equivalent, so a
          yearly price can never read as a monthly one. */}
      {showPrice && (
        <>
          <span className="mt-5 block font-serif text-[2.4rem] font-medium leading-none tracking-[-0.02em] text-ink sm:text-[2.6rem]">
            {offerAmountLabel(offer, interval)}
            <span className="font-sans text-[13px] font-normal tracking-normal text-ash">
              {" "}
              / {intervalNoun(interval)}
            </span>
          </span>

          <span className="mt-2 block min-h-[2.5rem] max-w-[26ch] font-sans text-[12px] leading-[1.55] text-fog">
            {interval === "annual" ? annualEquivalenceSentence(offer) : null}
          </span>
        </>
      )}

      {/* What the offer contains, then when it arrives. The bundle spans two
          schedules, so its cadence names each product beside its own. */}
      <span className="mt-4 mb-auto block w-full max-w-[26ch] border-t border-line/80 pt-4 text-left">
        {contents && (
          <span className="mb-3 block">
            <span className="block font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">
              {includedLabel}
            </span>
            <span className="mt-1 block font-sans text-[13px] leading-[1.55] text-ink">
              {contents}
            </span>
          </span>
        )}
        <span className="block">
          <span className="block font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">
            {cadenceLabel}
          </span>
          <span className="mt-1 block font-sans text-[13px] leading-[1.55] text-ink">
            {offerCadenceLabel(offer)}
          </span>
        </span>
      </span>
    </>
  );
}

/**
 * The characters that introduce an offer.
 *
 * Reuses the two drawings the homepage and the product pages already use.
 * OneRead has no character of its own — it is the bundle, so it is drawn as
 * the two products standing together rather than as a third figure. Which
 * characters appear is not a decision this component makes: it is whatever the
 * offer grants, so the drawing follows the registry if the grants change.
 *
 * The art is decorative: each SVG already carries `aria-hidden`, and the offer
 * is named in the text beside it.
 */
export function OfferMascots({ offer }: { offer: OfferKey }) {
  const granted = OFFERS[offer].grants;
  const size = granted.length > 1 ? "pair" : "solo";
  return (
    <span className="flex h-[4.5rem] items-end justify-center -space-x-4">
      {granted.map((product) => (
        <Mascot key={product} product={product} size={size}>
          {MASCOT_ART[product]}
        </Mascot>
      ))}
    </span>
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
 * One drawing at the restrained size these screens use: large enough to
 * identify the product, small enough that the prices stay the loudest thing in
 * the row. The `product-mascot` classes carry the same idle gestures as the
 * product pages, and the same reduced-motion opt-out.
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
    <span
      aria-hidden="true"
      className={`product-mascot block ${MASCOT_THEME[product]} ${
        size === "pair" ? "h-[3.75rem] w-[3.75rem]" : "h-[4.5rem] w-[4.5rem]"
      }`}
    >
      <span className="product-mascot-art block h-full w-full">{children}</span>
    </span>
  );
}

/**
 * The frame a column of offers sits in: hairlines rather than card edges, one
 * row on a wide screen and one stack on a phone.
 */
export const OFFER_ROW_CLASS =
  "grid grid-cols-1 divide-y divide-line border-y border-line md:grid-cols-3 md:divide-x md:divide-y-0";

/** One column of that row. Shared so both surfaces align identically. */
export function offerColumnClass(emphasised: boolean): string {
  return `flex h-full flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-9 ${
    emphasised ? "bg-cream/50" : ""
  }`;
}
