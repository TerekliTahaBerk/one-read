"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { productThemes } from "@/lib/product-themes";
import { FilmSignupForm } from "./FilmSignupForm";
import { FilmSampleEmailPreview } from "./FilmSampleEmailPreview";

export function FilmLanding() {
  const theme = productThemes.film;
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
        <Logo label="OneFilm" href="/film" ariaLabel="OneFilm home" />
      </header>

      <section className="mx-auto flex w-full max-w-[38rem] flex-1 flex-col items-center justify-center py-6 sm:py-8">
        <h1 className="max-w-[16ch] animate-rise-delayed text-center font-serif text-[2.5rem] font-medium leading-[1.02] tracking-[-0.028em] text-ink sm:text-[3.6rem] sm:leading-[0.98]">
          Bu akşam ne izleyeceğini <em className="font-serif font-normal italic">arama.</em>
        </h1>
        <p className="mt-5 max-w-[46ch] animate-rise-delayed-2 text-center font-sans text-[15px] leading-[1.65] text-ash text-pretty sm:mt-6 sm:text-[16px]">
          OneFilm sana tek bir filmi, neden izlemeye değer olduğunu ve hangi ruh hâline iyi geleceğini kısa bir notla gönderir.
        </p>
        <p className="mt-3 max-w-[42ch] animate-rise-delayed-2 text-center font-serif italic text-[14px] leading-[1.6] text-ash">
          Tek film. Kısa bir not. İzlemeye değer bir sebep.
        </p>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 animate-rise-delayed-2 text-center text-[12.5px] text-fog">
          <li>Tek film önerisi</li>
          <li aria-hidden>·</li>
          <li>Spoiler kontrollü</li>
          <li aria-hidden>·</li>
          <li>Liste yok, gürültü yok</li>
        </ul>
        <FilmSignupForm className="mt-7 animate-rise-delayed-3 sm:mt-8" />
        <FilmSampleEmailPreview className="mt-10 animate-rise-delayed-4 sm:mt-12" />
      </section>

      <Footer
        showPricing
        pricingHref="/film/pricing"
        tagline="Tek film. Kısa bir not. İzlemeye değer bir sebep."
        xAriaLabel="OneFilm on X"
      />
    </main>
  );
}
