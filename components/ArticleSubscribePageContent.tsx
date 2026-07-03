"use client";

import type { CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { SubscribeLookup } from "@/components/SubscribeLookup";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";
import { LEGACY_SUBSCRIBE_DICTIONARIES } from "@/lib/legacy-subscribe-i18n";

export function ArticleSubscribePageContent({ billingEnabled }: { billingEnabled: boolean }) {
  const { locale } = useSiteLanguage();
  const t = LEGACY_SUBSCRIBE_DICTIONARIES.article[locale];
  const theme = productThemes.article;

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
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/article" label={t.page.backLabel ?? "Back to OneArticle"} />
        <Logo label="OneArticle" href="/" ariaLabel={t.page.ariaLabel ?? "OneArticle — OneRead home"} />
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
          {t.page.title}
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
          {t.page.support}
        </p>

        <SubscribeLookup billingEnabled={billingEnabled} />
      </section>

      <Footer showBackHome backHref="/article" backLabel={t.page.backLabel ?? "Back to OneArticle"} />
    </main>
  );
}
