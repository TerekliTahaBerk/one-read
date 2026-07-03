import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { productThemes } from "@/lib/product-themes";
import { FilmSampleEmailPreview } from "./FilmSampleEmailPreview";

const DETAILS = [
  {
    title: "One film note, every Saturday",
    body: "No browsing, no endless scrolling through a streaming menu. One thoughtfully chosen film arrives with a short note on why it's worth your evening.",
  },
  {
    title: "Chosen for mood, not trends",
    body: "Every pick is matched to what a quiet evening actually calls for — not to what's popular this week or which algorithm is pushing it.",
  },
  {
    title: "Spoiler-light, on purpose",
    body: "The note tells you enough to decide — tone, mood, why it's worth watching — and never gives away what should stay a surprise.",
  },
  {
    title: "Real, grounded recommendations",
    body: "No invented ratings, no fake availability claims. Only what's genuinely known about the film makes it into the note.",
  },
  {
    title: "Edit anytime",
    body: "Change your genres, moods, or spoiler preference whenever you like. It's reflected in the very next note.",
  },
];

/**
 * OneFilm marketing/description page. Purely explanatory — signup itself
 * happens through the OneRead umbrella flow at /subscribe, which already
 * collects email once for the whole product family.
 */
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
        <h1 className="max-w-[17ch] animate-rise-delayed text-center font-serif text-[2.5rem] font-medium leading-[1.02] tracking-[-0.028em] text-ink sm:text-[3.6rem] sm:leading-[0.98]">
          Stop scrolling for something to watch. <em className="font-serif font-normal italic">Just watch this.</em>
        </h1>
        <p className="mt-5 max-w-[46ch] animate-rise-delayed-2 text-center font-sans text-[15px] leading-[1.65] text-ash text-pretty sm:mt-6 sm:text-[16px]">
          OneFilm sends you one film every Saturday — why it's worth
          watching, what mood it suits, and what to know before you press
          play — in a short, spoiler-light note.
        </p>
        <p className="mt-4 max-w-[42ch] animate-rise-delayed-2 text-center font-serif italic text-[14px] leading-[1.6] text-ash">
          One film. One short note. One reason worth watching.
        </p>

        <p className="mt-5 text-center font-sans text-[12.5px] leading-[1.55] text-fog animate-rise-delayed-2">
          Included in{" "}
          <Link href="/subscribe" className="link-underline text-ink hover:text-ink">
            OneRead
          </Link>{" "}
          — one subscription covers OneArticle and OneFilm.
        </p>

        <div className="mt-7 flex w-full flex-col items-center gap-3 animate-rise-delayed-3 sm:mt-8 sm:flex-row sm:justify-center">
          <Link
            href="/subscribe"
            className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter] duration-200 hover:brightness-95 sm:w-auto"
          >
            Start OneRead
          </Link>
          <Link
            href="/pricing"
            className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full border border-[var(--theme-border)] bg-white/65 px-6 font-sans text-[14px] font-medium text-ink transition-colors duration-200 hover:bg-white sm:w-auto"
          >
            See pricing
          </Link>
        </div>

        <dl className="mt-10 w-full max-w-[36rem] space-y-5 animate-rise-delayed-3 sm:mt-12">
          {DETAILS.map((d) => (
            <div key={d.title} className="border-t border-[var(--theme-border)] pt-4">
              <dt className="font-serif font-medium text-[1.05rem] leading-snug text-ink">
                {d.title}
              </dt>
              <dd className="mt-1.5 font-sans text-[14px] leading-[1.65] text-ash">
                {d.body}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 sm:mt-12">
          <FilmSampleEmailPreview className="animate-rise-delayed-4" />
        </div>
      </section>

      <Footer
        showPricing
        pricingHref="/pricing"
        tagline="One film. One short note. One reason worth watching."
        xAriaLabel="OneFilm on X"
      />
    </main>
  );
}
