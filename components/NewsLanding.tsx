"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { NewsEditionPreview } from "@/components/NewsEditionPreview";
import { OneNewsMascotArt } from "@/components/OneReadLineUp";
import { productThemes } from "@/lib/product-themes";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

/**
 * OneNews marketing/description page — the sibling of `ArticleLanding`, and
 * deliberately the same page: same shell, same rhythm, same spacing scale,
 * with only the product, the mascot, the accent and the copy differing. Like
 * OneArticle, it explains rather than signs anyone up; the CTA names the
 * OneNews offer so the plan chosen here is the plan that reaches checkout.
 */
export function NewsLanding() {
  const theme = productThemes.news;
  const pageBackground = productThemes.read.background;
  const { dictionary } = useSiteLanguage();

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
          backgroundColor: pageBackground,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-selected-surface": theme.selectedSurface,
          "--theme-page": pageBackground,
          "--theme-focus": theme.accent,
        } as CSSProperties
      }
    >
      <header className="relative w-full flex justify-center animate-rise">
        <Link
          href="/"
          aria-label={dictionary.common.backToOneRead}
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
        <Logo label="OneNews" href="/news" ariaLabel="OneNews" />
      </header>

      <section
        className="
          flex-1 w-full
          flex flex-col items-center justify-center
          max-w-[38rem] mx-auto
          py-6 sm:py-8
        "
      >
        <div
          aria-hidden="true"
          className="product-mascot product-mascot-news mb-3 h-[7.5rem] w-[7.5rem] animate-rise-delayed sm:mb-4 sm:h-[8.5rem] sm:w-[8.5rem]"
        >
          <div className="product-mascot-art h-full w-full">
            <OneNewsMascotArt />
          </div>
        </div>

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
          {dictionary.news.title}{" "}
          <em className="font-serif italic font-normal text-ink">{dictionary.news.titleEmphasis}</em>
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
          {dictionary.news.intro}
        </p>

        <p className="mt-4 text-center font-serif italic text-[14px] leading-[1.6] text-ash animate-rise-delayed-2">
          {dictionary.news.maxim}
        </p>

        <p className="mt-5 text-center font-sans text-[12.5px] leading-[1.55] text-fog animate-rise-delayed-2">
          {dictionary.common.includedIn}{" "}
          <Link href="/pricing" className="link-underline text-ink hover:text-ink">
            OneRead
          </Link>{" "}
          — {dictionary.common.subscriptionCovers}
        </p>

        <div className="mt-7 flex w-full flex-col items-center gap-3 animate-rise-delayed-3 sm:mt-8 sm:flex-row sm:justify-center">
          <Link
            href="/subscribe?offer=one-news&interval=annual"
            className="focus-ring inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--theme-accent)] px-6 font-sans text-[14px] font-medium text-paper transition-[filter] duration-200 hover:brightness-95 sm:w-auto"
          >
            Choose OneNews
          </Link>
        </div>

        <dl className="mt-10 w-full max-w-[36rem] space-y-5 animate-rise-delayed-3 sm:mt-12">
          {dictionary.news.details.map(([title, body]) => (
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

        <div className="mt-10 w-full max-w-[30rem] animate-rise-delayed-4 sm:mt-12">
          <p className="text-center font-sans text-[11px] uppercase tracking-eyebrow text-fog">
            What you’ll receive
          </p>
          <div className="mt-3">
            <NewsEditionPreview />
          </div>
        </div>
      </section>

      <Footer tagline={dictionary.news.tagline} />
    </main>
  );
}
