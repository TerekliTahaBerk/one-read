import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { LingoSubscribeLookup } from "@/components/LingoSubscribeLookup";
import { productThemes } from "@/lib/product-themes";

export const metadata: Metadata = {
  title: "Subscribe - OneLingo",
  description: "Manage or start your OneLingo subscription.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LingoSubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
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
        } as CSSProperties
      }
    >
      <header className="relative flex w-full justify-center animate-rise">
        <BackButton href="/" label="Back to OneRead" />
        <Logo label="OneLingo" href="/" ariaLabel="OneRead home" />
      </header>
      <section className="mx-auto my-auto flex w-full max-w-[36rem] flex-col items-center py-8 sm:py-10">
        <h1 className="animate-rise-delayed text-center font-serif text-[2.3rem] font-medium leading-tight text-ink">
          Manage OneLingo.
        </h1>
        <p className="mt-4 max-w-[40ch] animate-rise-delayed-2 text-center text-[15px] leading-7 text-ash">
          Look up your email to start checkout, resume email delivery, or manage billing.
        </p>
        <LingoSubscribeLookup initialEmail={searchParams.email ?? ""} />
      </section>
      <Footer showBackHome backHref="/" backLabel="Back to OneRead" />
    </main>
  );
}
