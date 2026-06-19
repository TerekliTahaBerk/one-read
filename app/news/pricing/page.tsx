import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { NEWS_PRICING, NEWS_TRUST_NOTES } from "@/lib/news/config";
import { productThemes } from "@/lib/product-themes";

export const metadata: Metadata = {
  title: "Pricing - OneNews",
  description: "Simple pricing for the OneNews morning briefing.",
};

export default function NewsPricingPage() {
  const theme = productThemes.news;
  return (
    <main
      className="relative flex min-h-svh w-full flex-col items-center px-5 pb-6 pt-7 sm:px-6 sm:pt-9"
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
          "--theme-page": theme.background,
        } as CSSProperties
      }
    >
      <header className="flex w-full justify-center animate-rise">
        <Logo label="OneNews" href="/news" ariaLabel="OneNews home" />
      </header>
      <section className="mx-auto my-auto flex w-full max-w-[34rem] flex-col items-center py-8 text-center sm:py-10">
        <h1 className="animate-rise-delayed font-serif text-[2.3rem] font-medium leading-tight text-ink">
          Start with a 7-day free trial.
        </h1>
        <p className="mt-4 max-w-[42ch] animate-rise-delayed-2 text-[15px] leading-7 text-ash">
          Try OneNews for a week. If it makes the morning feel clearer, keep receiving one calm briefing every day for ${NEWS_PRICING.monthly}/month or ${NEWS_PRICING.yearly}/year.
        </p>
        <div className="mt-7 w-full rounded-2xl border border-[var(--theme-border)] bg-white/65 p-6 shadow-sm">
          <div className="font-serif text-[42px] text-ink">${NEWS_PRICING.monthly}<span className="font-sans text-[14px] text-ash"> / month</span></div>
          <div className="mt-1 text-[13px] text-ash">${NEWS_PRICING.yearly} yearly option available in Polar</div>
          <ul className="mt-6 space-y-2 text-left text-[14px] leading-6 text-ash">
            {NEWS_TRUST_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <Link href="/news" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--theme-accent)] px-5 text-[14.5px] font-medium text-white">
            Start free trial
          </Link>
        </div>
      </section>
      <Footer showBackHome backHref="/news" backLabel="Back to OneNews" />
    </main>
  );
}
