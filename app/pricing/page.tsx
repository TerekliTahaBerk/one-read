import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pricing — One Read",
  description:
    "Simple pricing for a calmer morning. One carefully selected article summary in your inbox every day — $2/month or $18/year.",
};

const FEATURES = [
  "One curated article every morning",
  "Personalized by your interests",
  "English and Turkish summaries",
  "Source language preferences",
  "One-click unsubscribe",
];

export default function PricingPage() {
  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-7 sm:pt-9
        pb-6 sm:pb-8
      "
    >
      {/* Logo — links home */}
      <header className="w-full flex justify-center animate-rise">
        <Logo />
      </header>

      <section
        className="
          flex-1 w-full
          flex flex-col items-center justify-center
          max-w-[34rem] mx-auto
          py-8 sm:py-10
        "
      >
        <h1
          className="
            font-serif font-medium
            text-[2rem] leading-[1.08]
            sm:text-[2.5rem] sm:leading-[1.06]
            tracking-[-0.012em]
            text-ink text-center
            max-w-[18ch]
            animate-rise-delayed
          "
        >
          Simple pricing for a calmer morning.
        </h1>

        <p
          className="
            font-sans
            text-[15px] sm:text-[15.5px] leading-[1.65]
            text-ash text-center
            mt-5 max-w-[40ch]
            animate-rise-delayed-2
          "
        >
          One carefully selected article summary in your inbox every day.
        </p>

        {/* Pricing card */}
        <div
          className="
            w-full max-w-[24rem] mt-9 sm:mt-10
            rounded-2xl border border-line bg-paper/60
            px-6 py-7 sm:px-7 sm:py-8
            text-center
            animate-rise-delayed-3
          "
        >
          <p className="text-[11px] font-sans uppercase tracking-eyebrow text-fog">
            One Read
          </p>

          <div className="mt-3 flex items-baseline justify-center gap-1">
            <span className="font-serif font-medium text-[2.5rem] leading-none text-ink">
              $2
            </span>
            <span className="font-sans text-[14px] text-ash">/ month</span>
          </div>

          <p className="mt-2 font-sans text-[13.5px] text-ash">
            or <span className="text-ink">$18 / year</span>
          </p>
          <p className="mt-1 font-serif italic text-[13px] text-dawn">
            Save 25% with annual billing.
          </p>

          <ul className="mt-6 space-y-2.5 text-left">
            {FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 font-sans text-[14px] text-graphite"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                >
                  <path
                    d="M5 12.5l4.2 4.2L19 7"
                    stroke="#C97A2C"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/"
            className="
              focus-ring
              mt-7 inline-flex w-full h-12 items-center justify-center gap-2
              rounded-xl bg-ink text-paper
              font-sans text-[15px] tracking-tight
              transition-[transform,background-color] duration-200
              hover:bg-graphite active:scale-[0.99]
            "
          >
            Start with One Read
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2 7h10M8 3l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </section>

      <Footer showBackHome />
    </main>
  );
}
