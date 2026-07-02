import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { productThemes } from "@/lib/product-themes";
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
        <div className="mt-7 flex w-full flex-col items-center gap-3 animate-rise-delayed-3 sm:mt-8 sm:flex-row sm:justify-center">
          <Link
            href="/subscribe"
            className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full bg-ink px-6 font-sans text-[14px] font-medium text-white transition-colors duration-200 hover:bg-ink/90 sm:w-auto"
          >
            Start OneRead
          </Link>
          <Link
            href="/pricing"
            className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full border border-line-strong bg-white/65 px-6 font-sans text-[14px] font-medium text-ink transition-colors duration-200 hover:bg-white sm:w-auto"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-5 animate-rise-delayed-3 text-center font-sans text-[12.5px] leading-[1.55] text-fog">
          Included in OneRead — no separate payment.
        </p>
        <FilmSampleEmailPreview className="mt-10 animate-rise-delayed-4 sm:mt-12" />
      </section>

      <Footer
        showPricing
        pricingHref="/pricing"
        tagline="Tek film. Kısa bir not. İzlemeye değer bir sebep."
        xAriaLabel="OneFilm on X"
      />
    </main>
  );
}
