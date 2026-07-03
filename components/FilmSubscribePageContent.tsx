"use client";

import type { CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { FilmSubscribeLookup } from "@/components/FilmSubscribeLookup";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";
import { LEGACY_SUBSCRIBE_DICTIONARIES } from "@/lib/legacy-subscribe-i18n";

export function FilmSubscribePageContent({ initialEmail }: { initialEmail: string }) {
  const { dictionary, locale } = useSiteLanguage();
  const t = LEGACY_SUBSCRIBE_DICTIONARIES.film[locale];
  const theme = productThemes.film;
  return (
    <main
      className="relative flex min-h-svh w-full flex-col items-center px-5 pb-6 pt-7 sm:px-6 sm:pt-9"
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
        } as CSSProperties
      }
    >
      <header className="relative flex w-full justify-center animate-rise">
        <BackButton href="/" label={dictionary.common.backToOneRead} />
        <Logo label="OneFilm" href="/" ariaLabel={dictionary.common.oneReadHome} />
      </header>
      <section className="mx-auto my-auto flex w-full max-w-[36rem] flex-col items-center py-8 sm:py-10">
        <h1 className="animate-rise-delayed text-center font-serif text-[2.3rem] font-medium leading-tight text-ink">
          {t.page.title}
        </h1>
        <p className="mt-4 max-w-[40ch] animate-rise-delayed-2 text-center text-[15px] leading-7 text-ash">
          {t.page.support}
        </p>
        <FilmSubscribeLookup initialEmail={initialEmail} />
      </section>
      <Footer showBackHome backHref="/" backLabel={dictionary.common.backToOneRead} />
    </main>
  );
}
