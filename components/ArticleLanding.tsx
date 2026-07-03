import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { SampleEmailPreview } from "@/components/SampleEmailPreview";
import { productThemes } from "@/lib/product-themes";

const DETAILS = [
  {
    title: "One brief, every weekday morning",
    body: "At 7 AM, one carefully chosen article lands in your inbox — read start to finish in about five minutes, before the rest of the day gets noisy.",
  },
  {
    title: "Chosen around your interests",
    body: "Pick a handful of topics you actually care about. Every brief is matched to that profile, not to whatever is trending.",
  },
  {
    title: "Distilled, not just forwarded",
    body: "We don't just link out — we read the source and write a short, clear summary of the one idea worth knowing.",
  },
  {
    title: "Read in your language",
    body: "Choose your summary language and your preferred source language independently — English, Turkish, Spanish, French, or German.",
  },
  {
    title: "Edit anytime",
    body: "Change your interests or languages whenever you like. The next morning's brief reflects it immediately.",
  },
];

/**
 * OneArticle marketing/description page. Purely explanatory — signup itself
 * happens through the OneRead umbrella flow at /subscribe, which already
 * collects email once for the whole product family.
 */
export function ArticleLanding() {
  const theme = productThemes.article;

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
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
        <Link
          href="/"
          aria-label="Back to OneRead"
          className="
            focus-ring
            absolute left-0 top-1/2 -translate-y-1/2
            inline-flex h-10 w-10 items-center justify-center
            rounded-full text-ash
            transition-colors duration-200
            hover:text-ink hover:bg-[var(--theme-surface)]
          "
        >
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M12 7H2M6 3L2 7l4 4"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <Logo label="OneArticle" href="/article" ariaLabel="OneArticle home" />
      </header>

      <section
        className="
          flex-1 w-full
          flex flex-col items-center justify-center
          max-w-[38rem] mx-auto
          py-6 sm:py-8
        "
      >
        <h1
          className="
            font-serif font-medium
            text-[2.5rem] leading-[1.02]
            sm:text-[3.6rem] sm:leading-[0.98]
            tracking-[-0.028em]
            text-ink text-center text-balance
            max-w-[16ch]
            animate-rise-delayed
          "
        >
          One article worth reading.{" "}
          <em className="font-serif italic font-normal text-ink">Every morning.</em>
        </h1>

        <p
          className="
            font-sans
            text-[15px] sm:text-[16px] leading-[1.65]
            text-ash text-center text-pretty
            mt-5 sm:mt-6
            max-w-[44ch]
            animate-rise-delayed-2
          "
        >
          OneArticle sends one carefully chosen article brief to your inbox
          every weekday morning — picked around your interests and distilled
          into a short, clear read. No feed to scroll. No app to open.
        </p>

        <p className="mt-4 text-center font-serif italic text-[14px] leading-[1.6] text-ash animate-rise-delayed-2">
          One article. One idea worth knowing. Nothing else.
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
          <SampleEmailPreview className="animate-rise-delayed-4" />
        </div>
      </section>

      <Footer
        tagline="No feed. No app. One good read before the day gets noisy."
      />
    </main>
  );
}
