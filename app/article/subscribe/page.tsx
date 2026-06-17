import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { SubscribeLookup } from "@/components/SubscribeLookup";
import { productThemes } from "@/lib/product-themes";
import { isMockAllowed } from "@/lib/billing/mock";
import { isBillingConfigured } from "@/lib/billing/provider";

export const metadata: Metadata = {
  title: "Subscribe — OneArticle",
  description:
    "Enter your email to continue your OneArticle subscription, manage billing, or restart your daily emails.",
};

export default function ArticleSubscribePage() {
  const theme = productThemes.article;
  // Billing CTAs are live when a provider is usable: mock in dev (or an
  // explicit prod preview), or any configured provider. Otherwise CTAs degrade
  // to a pricing-page link.
  const billingEnabled = isMockAllowed() || isBillingConfigured();

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-7 sm:pt-9
        pb-6 sm:pb-8
      "
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-selected-surface": theme.selectedSurface,
          "--theme-page": theme.background,
          "--theme-focus": theme.accent,
        } as CSSProperties
      }
    >
      <header className="w-full flex justify-center animate-rise">
        <Logo label="OneArticle" href="/" ariaLabel="OneArticle — OneRead home" />
      </header>

      <section
        className="
          w-full
          flex flex-col items-center
          max-w-[34rem] mx-auto
          py-8 sm:py-10
          my-auto
        "
      >
        <h1
          className="
            font-serif font-medium
            text-[2rem] leading-[1.08]
            sm:text-[2.5rem] sm:leading-[1.06]
            tracking-[-0.012em]
            text-ink text-center
            max-w-[20ch]
            animate-rise-delayed
          "
        >
          Continue your subscription.
        </h1>

        <p
          className="
            font-sans
            text-[15px] sm:text-[15.5px] leading-[1.65]
            text-ash text-center
            mt-5 max-w-[42ch]
            animate-rise-delayed-2
          "
        >
          Enter your email and we’ll show you exactly what to do next.
        </p>

        <SubscribeLookup billingEnabled={billingEnabled} />
      </section>

      <Footer showBackHome backHref="/article" backLabel="Back to OneArticle" />
    </main>
  );
}
