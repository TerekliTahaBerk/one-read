import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { productThemes } from "@/lib/product-themes";

export const metadata: Metadata = {
  title: "Checkout complete — OneArticle",
  description: "Your OneArticle checkout is complete and activation is syncing.",
};

export default function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: { checkout_id?: string; email?: string };
}) {
  const theme = productThemes.article;
  const subscribeHref = searchParams.email
    ? `/article/subscribe?email=${encodeURIComponent(searchParams.email)}`
    : "/article/subscribe";

  return (
    <main
      className="relative min-h-svh w-full flex flex-col items-center px-5 sm:px-6 pt-7 sm:pt-9 pb-6 sm:pb-8"
      style={
        {
          backgroundColor: theme.background,
          "--theme-accent": theme.accent,
          "--theme-border": theme.border,
          "--theme-surface": theme.surface,
        } as CSSProperties
      }
    >
      <header className="relative w-full flex justify-center animate-rise">
        <BackButton href="/article" label="Back to OneArticle" />
        <Logo label="OneArticle" href="/" ariaLabel="OneArticle — OneRead home" />
      </header>

      <section className="w-full flex flex-col items-center max-w-[34rem] mx-auto py-8 sm:py-10 my-auto text-center">
        <p className="font-sans text-[11px] uppercase tracking-eyebrow text-fog">
          Checkout complete
        </p>
        <h1 className="font-serif font-medium text-[2rem] leading-[1.08] sm:text-[2.5rem] sm:leading-[1.06] text-ink mt-3">
          We’re activating your subscription.
        </h1>
        <p className="font-sans text-[15px] sm:text-[15.5px] leading-[1.65] text-ash mt-5 max-w-[42ch]">
          Your checkout is complete. Access may take a moment while Polar
          confirms the subscription and our system syncs it.
        </p>
        {searchParams.checkout_id ? (
          <p className="font-mono text-[11px] text-fog mt-4">
            Checkout {searchParams.checkout_id}
          </p>
        ) : null}
        <Link
          href={subscribeHref}
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--theme-accent)] px-5 font-sans text-[15px] text-white"
        >
          Check subscription status
        </Link>
      </section>

      <Footer showBackHome backHref="/article" backLabel="Back to OneArticle" />
    </main>
  );
}
