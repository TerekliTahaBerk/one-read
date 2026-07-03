"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { OneFilmMascotArt } from "@/components/OneReadFamilyMascots";
import { productThemes } from "@/lib/product-themes";
import { FilmSampleEmailPreview } from "./FilmSampleEmailPreview";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

/**
 * OneFilm marketing/description page. Purely explanatory — signup itself
 * happens through the OneRead umbrella flow at /subscribe, which already
 * collects email once for the whole product family.
 */
export function FilmLanding() {
  const theme = productThemes.film;
  const pageBackground = productThemes.read.background;
  const { dictionary } = useSiteLanguage();
  return (
    <main
      className="relative flex min-h-svh w-full flex-col items-center px-5 pb-5 pt-5 sm:px-6 sm:pt-6"
      style={
        {
          backgroundColor: pageBackground,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-selected-surface": theme.surface,
          "--theme-page": pageBackground,
          "--theme-focus": theme.accent,
        } as CSSProperties
      }
    >
      <header className="relative flex w-full justify-center animate-rise">
        <Link
          href="/"
          aria-label={dictionary.common.backToOneRead}
          className="focus-ring absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ash transition-colors hover:bg-[var(--theme-surface)] hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M12 7H2M6 3L2 7l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Logo label="OneFilm" href="/film" ariaLabel="OneFilm home" />
      </header>

      <section className="mx-auto flex w-full max-w-[38rem] flex-1 flex-col items-center justify-center py-6 sm:py-8">
        <div
          aria-hidden="true"
          className="product-mascot product-mascot-film mb-3 h-[7.5rem] w-[7.5rem] animate-rise-delayed sm:mb-4 sm:h-[8.5rem] sm:w-[8.5rem]"
        >
          <div className="product-mascot-art h-full w-full">
            <OneFilmMascotArt />
          </div>
        </div>

        <h1 className="max-w-[17ch] animate-rise-delayed text-center font-serif text-[2.5rem] font-medium leading-[1.02] tracking-[-0.028em] text-ink sm:text-[3.6rem] sm:leading-[0.98]">
          {dictionary.film.title} <em className="font-serif font-normal italic">{dictionary.film.titleEmphasis}</em>
        </h1>
        <p className="mt-5 max-w-[46ch] animate-rise-delayed-2 text-center font-sans text-[15px] leading-[1.65] text-ash text-pretty sm:mt-6 sm:text-[16px]">
          {dictionary.film.intro}
        </p>
        <p className="mt-4 max-w-[42ch] animate-rise-delayed-2 text-center font-serif italic text-[14px] leading-[1.6] text-ash">
          {dictionary.film.maxim}
        </p>

        <p className="mt-5 text-center font-sans text-[12.5px] leading-[1.55] text-fog animate-rise-delayed-2">
          {dictionary.common.includedIn}{" "}
          <Link href="/subscribe" className="link-underline text-ink hover:text-ink">
            OneRead
          </Link>{" "}
          — {dictionary.common.subscriptionCovers}
        </p>

        <div className="mt-7 flex w-full flex-col items-center gap-3 animate-rise-delayed-3 sm:mt-8 sm:flex-row sm:justify-center">
          <Link
            href="/subscribe"
            className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter] duration-200 hover:brightness-95 sm:w-auto"
          >
            {dictionary.common.startOneRead}
          </Link>
        </div>

        <dl className="mt-10 w-full max-w-[36rem] space-y-5 animate-rise-delayed-3 sm:mt-12">
          {dictionary.film.details.map(([title, body]) => (
            <div key={title} className="border-t border-[var(--theme-border)] pt-4">
              <dt className="font-serif font-medium text-[1.05rem] leading-snug text-ink">
                {title}
              </dt>
              <dd className="mt-1.5 font-sans text-[14px] leading-[1.65] text-ash">
                {body}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 sm:mt-12">
          <FilmSampleEmailPreview className="animate-rise-delayed-4" />
        </div>
      </section>

      <Footer
        tagline={dictionary.film.tagline}
      />
    </main>
  );
}
