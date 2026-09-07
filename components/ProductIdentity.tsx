"use client";

import type { CSSProperties, ReactNode } from "react";
import { OneArticleMascotArt, OneNewsMascotArt } from "@/components/OneReadLineUp";
import { productThemes, type ProductThemeKey } from "@/lib/product-themes";
import {
  OFFERS,
  PRODUCT_ONE_ARTICLE,
  PRODUCT_ONE_NEWS,
  type OfferKey,
  type ProductKey,
} from "@/lib/products/registry";

/**
 * Who a screen belongs to, drawn and coloured the same way everywhere.
 *
 * The acquisition and account flows are one layout with three identities in
 * it. Rather than let each screen decide what "OneNews" looks like, everything
 * product-specific about them is resolved here — the characters, and the theme
 * variables the shared controls read — so /subscribe, /preferences and
 * /pricing can never disagree about which blue OneArticle is.
 *
 * There is no third OneRead character. OneRead is the bundle, so it is drawn
 * as its two products standing together and coloured with the neutral brand
 * ink, which is exactly what the registry's grants already say.
 */

const PRODUCT_THEME_KEYS: Record<ProductKey, ProductThemeKey> = {
  [PRODUCT_ONE_ARTICLE]: "article",
  [PRODUCT_ONE_NEWS]: "news",
};

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

/** The theme one product is dressed in. */
export function productThemeKey(product: ProductKey): ProductThemeKey {
  return PRODUCT_THEME_KEYS[product];
}

/**
 * The theme an offer is dressed in: its product's when it sells one, and the
 * neutral brand theme when it sells both. Read from the registry's grants, so
 * an offer that changed what it includes changes colour with it.
 */
export function offerThemeKey(offer: OfferKey): ProductThemeKey {
  const granted = OFFERS[offer].grants;
  return granted.length === 1 ? PRODUCT_THEME_KEYS[granted[0]] : "read";
}

/**
 * The theme as the CSS variables the shared controls read.
 *
 * Identical in shape to the one the product pages set, so a button styled with
 * `bg-[var(--theme-accent)]` looks the same on /article as it does halfway
 * through signup. The page itself stays the canonical white: a product tints
 * its controls, never the paper under them.
 */
export function themeStyle(key: ProductThemeKey): CSSProperties {
  const theme = productThemes[key];
  const page = productThemes.read.background;
  return {
    "--theme-accent": theme.accent,
    "--theme-border": theme.border,
    "--theme-surface": theme.surface,
    "--theme-selected-surface": theme.selectedSurface,
    "--theme-page": page,
    "--theme-focus": theme.accent,
  } as CSSProperties;
}

/**
 * The characters that introduce an offer: one for a standalone product, both
 * for the bundle. Decorative — each SVG carries `aria-hidden`, and the offer
 * is always named in the text beside it, so a screen reader hears the product
 * once rather than twice.
 */
export function OfferMascots({
  offer,
  size = "md",
  className = "",
}: {
  offer: OfferKey;
  size?: MascotSize;
  className?: string;
}) {
  const granted = OFFERS[offer].grants;
  return (
    <span className={`flex items-end justify-center -space-x-4 ${MASCOT_BOX[size]} ${className}`}>
      {granted.map((product) => (
        <ProductMascot
          key={product}
          product={product}
          size={size}
          paired={granted.length > 1}
        />
      ))}
    </span>
  );
}

export type MascotSize = "sm" | "md" | "lg";

/** The row height each size reserves, so a step's heading never shifts. */
const MASCOT_BOX: Record<MascotSize, string> = {
  sm: "h-[2.75rem]",
  md: "h-[4.5rem]",
  lg: "h-[5.5rem]",
};

/** One drawing, solo or standing beside its sibling. */
const MASCOT_SIZE: Record<MascotSize, { solo: string; paired: string }> = {
  sm: { solo: "h-[2.75rem] w-[2.75rem]", paired: "h-[2.4rem] w-[2.4rem]" },
  md: { solo: "h-[4.5rem] w-[4.5rem]", paired: "h-[3.75rem] w-[3.75rem]" },
  lg: { solo: "h-[5.5rem] w-[5.5rem]", paired: "h-[4.5rem] w-[4.5rem]" },
};

/**
 * One product as a character, at the restrained size these screens use: large
 * enough to identify the product, small enough that the price or the form
 * stays the loudest thing on the screen. The `product-mascot` classes carry
 * the same idle gestures as the product pages, and the same reduced-motion
 * opt-out, so nothing here restarts an entrance animation mid-form.
 */
export function ProductMascot({
  product,
  size = "md",
  paired = false,
}: {
  product: ProductKey;
  size?: MascotSize;
  paired?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`product-mascot block ${MASCOT_THEME[product]} ${
        paired ? MASCOT_SIZE[size].paired : MASCOT_SIZE[size].solo
      }`}
    >
      <span className="product-mascot-art block h-full w-full">{MASCOT_ART[product]}</span>
    </span>
  );
}
