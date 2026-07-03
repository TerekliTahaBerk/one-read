"use client";

import type { CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { OneReadPricingCard } from "@/components/OneReadPricingCard";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { ONEREAD_BILLING_LABEL } from "@/lib/oneread/config";
import { productThemes } from "@/lib/product-themes";

export function PricingPageContent() {
  const theme = productThemes.read;
  const { dictionary } = useSiteLanguage();
  const price = ONEREAD_BILLING_LABEL.split(" / ")[0];

  return (
    <main
      className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-7 sm:pt-9 pb-6 sm:pb-8"
      style={{
        backgroundColor: theme.background,
        "--theme-accent": theme.accent,
        "--theme-border": theme.border,
        "--theme-surface": theme.surface,
        "--theme-page": theme.background,
        "--theme-focus": theme.accent,
      } as CSSProperties}
    >
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo href="/" ariaLabel={dictionary.common.oneReadHome} />
      </header>

      <section className="w-full flex flex-col items-center max-w-[34rem] mx-auto py-8 sm:py-10 my-auto">
        <h1 className="font-serif font-medium text-[2rem] leading-[1.08] sm:text-[2.5rem] sm:leading-[1.06] tracking-[-0.012em] text-ink text-center max-w-[18ch] animate-rise-delayed">
          {dictionary.pricing.title.replace("{price}", price)}
        </h1>
        <p className="font-sans text-[15px] sm:text-[15.5px] leading-[1.65] text-ash text-center mt-5 max-w-[40ch] animate-rise-delayed-2">
          {dictionary.pricing.intro}
        </p>
        <OneReadPricingCard />
      </section>

      <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}
