/**
 * The canonical brand / product / offer terminology contract.
 *
 * `registry.ts` owns *what we sell*: which products exist, which offers grant
 * them, and at what price. This module owns *what we call those things* on
 * every surface that a subscriber, an operator, or a search engine can read.
 *
 * ── The model ───────────────────────────────────────────────────────────────
 *
 *   Brand    OneRead      The umbrella. Never an editorial product in its own
 *                         right, and never something a reader receives.
 *   Product  OneArticle   Weekday article brief.
 *            OneNews      Mon / Wed / Fri news brief.
 *   Offer    OneArticle   Standalone purchase of that product.
 *            OneNews      Standalone purchase of that product.
 *            OneRead      The bundle. Grants both products.
 *
 * `OneRead` therefore names two different things — the brand and the bundle
 * offer — which is exactly why the ambiguity is written down here rather than
 * left for each surface to resolve. `identityFor` returns both readings, and
 * every caller must state which one it means.
 *
 * ── Why a contract rather than a style guide ────────────────────────────────
 *
 * Names drifted before: the offer registry, the signup flow, the marketing
 * dictionary, and the legal copy each carried their own spelling of what a
 * subscription includes, and the retired planning vocabulary (OneFilm,
 * OneLingo, the $1 umbrella, "$3 All Access") outlived the products it named.
 * `ALIASES` records the drift that has already been consolidated so it is
 * recognisable if it returns; `RETIRED_TERMINOLOGY` and
 * `PUBLIC_COMMERCIAL_SURFACES` let `terminology.test.ts` fail a build that
 * reintroduces it, rather than leaving it to be spotted in production copy.
 *
 * Nothing here defines a price, a cadence, or a grant. Those come from the
 * registry — a second copy of them is the drift this module exists to stop.
 */

import {
  OFFERS,
  OFFER_KEYS,
  OFFER_ONE_READ_BUNDLE,
  PRODUCTS,
  PRODUCT_KEYS,
  isOfferKey,
  isProductKey,
  type OfferKey,
  type ProductKey,
} from "./registry";

/* ------------------------------- the brand ------------------------------- */

/** The umbrella brand. Not a product, and not by itself something to buy. */
export const BRAND_NAME = "OneRead" as const;

/* ------------------------------ identities ------------------------------- */

/**
 * What sort of thing a name refers to.
 *
 *   brand   — the company/umbrella.
 *   product — an editorial thing a subscriber receives.
 *   offer   — a thing a subscriber can buy.
 */
export const IDENTITY_KINDS = ["brand", "product", "offer"] as const;
export type IdentityKind = (typeof IDENTITY_KINDS)[number];

export interface Identity {
  kind: IdentityKind;
  /** Registry key, or `"one-read"` for the brand itself. */
  key: string;
  /** The only spelling allowed on any surface. */
  displayName: string;
  /** One line explaining what this name refers to, for operators and docs. */
  meaning: string;
}

export const BRAND_IDENTITY: Identity = {
  kind: "brand",
  key: "one-read",
  displayName: BRAND_NAME,
  meaning: "The umbrella brand covering every editorial product.",
};

export const PRODUCT_IDENTITIES: readonly Identity[] = PRODUCT_KEYS.map((key) => ({
  kind: "product",
  key,
  displayName: PRODUCTS[key].displayName,
  meaning: PRODUCTS[key].tagline,
}));

export const OFFER_IDENTITIES: readonly Identity[] = OFFER_KEYS.map((key) => ({
  kind: "offer",
  key,
  displayName: OFFERS[key].displayName,
  meaning:
    OFFERS[key].grants.length > 1
      ? `Bundle offer granting ${offerIncludesLabel(key)}.`
      : `Standalone offer granting ${OFFERS[key].displayName}.`,
}));

/** Every canonical identity, brand first. */
export const IDENTITIES: readonly Identity[] = [
  BRAND_IDENTITY,
  ...PRODUCT_IDENTITIES,
  ...OFFER_IDENTITIES,
];

/**
 * Every reading of a name, strongest context first.
 *
 * Returns more than one entry for "one-read" on purpose: it is both the brand
 * and the bundle offer, and a caller that has not decided which it means has a
 * copy bug rather than a lookup failure.
 */
export function identitiesFor(key: string): readonly Identity[] {
  return IDENTITIES.filter((identity) => identity.key === key);
}

/** The display name for a product key. Throws rather than guess. */
export function productDisplayName(key: ProductKey): string {
  return PRODUCTS[key].displayName;
}

/** The display name for an offer key. Throws rather than guess. */
export function offerDisplayName(key: OfferKey): string {
  return OFFERS[key].displayName;
}

/**
 * The display name for an untrusted key, or null. Prefers the product reading,
 * because a surface naming a key it cannot type is describing a delivery, not
 * a purchase.
 */
export function displayNameFor(key: unknown): string | null {
  if (typeof key !== "string") return null;
  if (isProductKey(key)) return productDisplayName(key);
  if (isOfferKey(key)) return offerDisplayName(key);
  return null;
}

/* --------------------------- derived descriptions ------------------------ */

/**
 * The products an offer grants, named and joined — "OneArticle + OneNews".
 *
 * Derived from `grants`, so an offer that starts or stops including a product
 * cannot leave a hand-written "includes…" string behind on a checkout screen.
 */
export function offerIncludesLabel(offer: OfferKey, separator = " + "): string {
  return OFFERS[offer].grants.map(productDisplayName).join(separator);
}

/** Whether an offer is the umbrella bundle rather than a standalone product. */
export function isBundleOffer(offer: OfferKey): boolean {
  return OFFERS[offer].grants.length > 1;
}

/** The bundle offer's key. The one place a surface may hardcode "the bundle". */
export const BUNDLE_OFFER_KEY: OfferKey = OFFER_ONE_READ_BUNDLE;

/* ---------------------------- the alias inventory ------------------------ */

export interface TerminologyAlias {
  /** The name that has been used instead of the canonical one. */
  alias: string;
  /** The identity it actually refers to. */
  canonical: string;
  /** Where it came from, so a reviewer can tell drift from a deliberate name. */
  note: string;
}

/**
 * Names that have referred to a canonical identity somewhere in this repo's
 * history. Kept as data so the inventory is reviewable, and so a surface that
 * reintroduces one is arguing with a written record rather than a habit.
 *
 * These are *not* forbidden — several are correct in the billing layer, where
 * a closed plan must still be nameable. They are forbidden on the public
 * commercial surfaces below, which describe only what is on sale today.
 */
export const ALIASES: readonly TerminologyAlias[] = [
  {
    alias: "one-read umbrella",
    canonical: "OneRead (offer)",
    note: "Billing-layer name for the closed $1 plan. Never the current bundle.",
  },
  {
    alias: "legacy-one-read-umbrella",
    canonical: "OneRead (offer)",
    note: "Registry key for that closed plan. Grants OneArticle only.",
  },
  {
    alias: "OneRead family",
    canonical: "OneRead (brand)",
    note: "Planning-era name for the product line. Say 'OneRead' or name the products.",
  },
  {
    alias: "All Access",
    canonical: "OneRead (offer)",
    note: "Retired planning name for the bundle. The bundle is called OneRead.",
  },
  {
    alias: "One Article",
    canonical: "OneArticle",
    note: "Spaced spelling. The product is one word.",
  },
  {
    alias: "article brief",
    canonical: "OneArticle",
    note: "Descriptive, not a name. Fine in body copy, never as the product's label.",
  },
];

/* --------------------------- retired terminology ------------------------- */

export interface RetiredTerm {
  /** What the term was. */
  term: string;
  /** Matches the term as it would appear in source or copy. */
  pattern: RegExp;
  /** What a surface should say instead, and why the old form is wrong now. */
  guidance: string;
}

/**
 * Vocabulary that must not appear on a public commercial surface.
 *
 * Retired *products* are matched by name: their models and routes still exist
 * to preserve history, but nothing we sell includes them.
 *
 * Retired *pricing* is matched by claim rather than by the digit, because the
 * closed $1 plan must still be nameable where we disclose it to the
 * grandfathered subscribers who are on it. "OneRead is $1" is a sales claim;
 * "your grandfathered $1 plan" is a disclosure.
 */
export const RETIRED_TERMINOLOGY: readonly RetiredTerm[] = [
  {
    term: "OneFilm",
    pattern: /\bone[\s-]?film\b/i,
    guidance: "OneFilm is retired. Public copy names OneArticle and OneNews only.",
  },
  {
    term: "OneLingo",
    pattern: /\bone[\s-]?lingo\b/i,
    guidance: "OneLingo is retired. Public copy names OneArticle and OneNews only.",
  },
  {
    term: "OneGoal",
    pattern: /\bone[\s-]?goal\b/i,
    guidance: "OneGoal was never launched. Public copy names OneArticle and OneNews only.",
  },
  {
    term: "All Access",
    pattern: /\ball[\s-]?access\b/i,
    guidance: "The bundle is called OneRead. Prices come from the offer registry.",
  },
  {
    term: "the $1 subscription",
    pattern: /\$\s?1\s*(?:\/|per\s+|a\s+)month|\bone dollar\b|OneRead is \$\s?1\b/i,
    guidance:
      "The $1 umbrella is closed. Sales surfaces read prices from the offer registry; only a grandfathering disclosure may name that price.",
  },
  {
    term: "the OneRead family",
    // Matched in every site locale: the phrase drifted into all four at once,
    // so guarding only the English form would let three of them come back.
    pattern:
      /\bOneRead family\b|\bfamille OneRead\b|\bOneRead[- ]Familie\b|\bOneRead ailesi/i,
    guidance:
      "'Family' was planning-era vocabulary for an unbuilt line-up. Say OneRead, or name the two products.",
  },
];

/**
 * The surfaces the retired vocabulary must stay off: everything a prospective
 * or paying subscriber reads about what OneRead is and what it costs.
 *
 * Deliberately excludes the billing, entitlement, and admin layers, which have
 * to keep naming closed plans in order to honour them, and the Prisma schema,
 * which retains retired models to preserve historical rows.
 */
export const PUBLIC_COMMERCIAL_SURFACES: readonly string[] = [
  "README.md",
  "app/layout.tsx",
  "app/manifest.ts",
  "app/page.tsx",
  "app/pricing/page.tsx",
  "components/ArticleLanding.tsx",
  "components/ArticleSubscribeSuccessContent.tsx",
  "components/EditorialStandardsContent.tsx",
  "components/Footer.tsx",
  "components/HomePageContent.tsx",
  "components/OneReadFamilyMascots.tsx",
  "components/OneReadPreferences.tsx",
  "components/OneReadSignup.tsx",
  "components/PricingPageContent.tsx",
  "components/SamplePageContent.tsx",
  "lib/legal-i18n.ts",
  "lib/site-i18n.ts",
];

/** Retired terms present in a chunk of copy or source. Empty means clean. */
export function findRetiredTerminology(contents: string): readonly RetiredTerm[] {
  return RETIRED_TERMINOLOGY.filter((entry) => entry.pattern.test(contents));
}
