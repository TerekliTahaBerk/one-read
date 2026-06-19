"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { productThemes } from "@/lib/product-themes";
import { NewsSignupForm } from "./NewsSignupForm";
import { NewsSampleEmailPreview } from "./NewsSampleEmailPreview";

export function NewsLanding() {
  const theme = productThemes.news;
  return (
    <main
      className="relative flex min-h-svh w-full flex-col items-center px-5 pb-5 pt-5 sm:px-6 sm:pt-6"
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-selected-surface": theme.surface,
          "--theme-page": theme.background,
          "--theme-focus": theme.accent,
        } as CSSProperties
      }
    >
      <header className="relative flex w-full justify-center animate-rise">
        <Link
          href="/"
          aria-label="Back to OneRead"
          className="focus-ring absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ash transition-colors hover:bg-[var(--theme-surface)] hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Logo label="OneNews" href="/news" ariaLabel="OneNews home" />
      </header>

      <section className="mx-auto flex w-full max-w-[38rem] flex-1 flex-col items-center justify-center py-6 sm:py-8">
        <h1 className="max-w-[16ch] animate-rise-delayed text-center font-serif text-[2.5rem] font-medium leading-[1.02] tracking-[-0.028em] text-ink sm:text-[3.6rem] sm:leading-[0.98]">
          The stories worth knowing, <em className="font-serif font-normal italic">without the noise.</em>
        </h1>
        <p className="mt-5 max-w-[44ch] animate-rise-delayed-2 text-center font-sans text-[15px] leading-[1.65] text-ash text-pretty sm:mt-6 sm:text-[16px]">
          OneNews sends a short morning briefing to your inbox at 7 AM — clear summaries, source links, and no endless feed to open.
        </p>
        <p className="mt-3 max-w-[42ch] animate-rise-delayed-2 text-center font-serif italic text-[14px] leading-[1.6] text-ash">
          No breaking-news panic. No doomscrolling. Just a calmer morning briefing.
        </p>
        <NewsSignupForm className="mt-7 animate-rise-delayed-3 sm:mt-8" />
        <NewsSampleEmailPreview className="mt-10 animate-rise-delayed-4 sm:mt-12" />
      </section>

      <Footer
        showPricing
        pricingHref="/news/pricing"
        tagline="The news, without a feed to fall into."
        xAriaLabel="OneNews on X"
      />
    </main>
  );
}
