import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { LINGO_PRICING, LINGO_TRUST_NOTES } from "@/lib/lingo/config";
import { productThemes } from "@/lib/product-themes";

export const metadata: Metadata = {
  title: "Pricing - OneLingo",
  description: "Simple pricing for OneLingo language-practice emails.",
};

export default function LingoPricingPage() {
  const theme = productThemes.lingo;
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
        <Logo label="OneLingo" href="/lingo" ariaLabel="OneLingo home" />
      </header>
      <section className="mx-auto my-auto flex w-full max-w-[34rem] flex-col items-center py-8 text-center sm:py-10">
        <h1 className="animate-rise-delayed font-serif text-[2.3rem] font-medium leading-tight text-ink">
          OneLingo, simply priced.
        </h1>
        <p className="mt-4 max-w-[40ch] animate-rise-delayed-2 text-[15px] leading-7 text-ash">
          Try a week of calm daily language practice. Continue for ${LINGO_PRICING.monthly}/month or ${LINGO_PRICING.yearly}/year.
        </p>
        <div className="mt-7 w-full rounded-2xl border border-[var(--theme-border)] bg-white/65 p-6 shadow-sm">
          <div className="font-serif text-[42px] text-ink">${LINGO_PRICING.monthly}<span className="font-sans text-[14px] text-ash"> / month</span></div>
          <div className="mt-1 text-[13px] text-ash">${LINGO_PRICING.yearly} yearly option available in Polar</div>
          <ul className="mt-6 space-y-2 text-left text-[14px] leading-6 text-ash">
            {LINGO_TRUST_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <Link href="/lingo" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--theme-accent)] px-5 text-[14.5px] font-medium text-white">
            Start free trial
          </Link>
        </div>
      </section>
      <Footer showBackHome backHref="/lingo" backLabel="Back to OneLingo" />
    </main>
  );
}
