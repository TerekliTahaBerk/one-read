import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { FilmSubscribeLookup } from "@/components/FilmSubscribeLookup";
import { productThemes } from "@/lib/product-themes";

export const metadata: Metadata = {
  title: "Abonelik - OneFilm",
  description: "OneFilm aboneliğini başlat veya yönet.",
};

export default function FilmSubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const theme = productThemes.film;
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
      <header className="flex w-full justify-center animate-rise">
        <Logo label="OneFilm" href="/film" ariaLabel="OneFilm home" />
      </header>
      <section className="mx-auto my-auto flex w-full max-w-[36rem] flex-col items-center py-8 sm:py-10">
        <h1 className="animate-rise-delayed text-center font-serif text-[2.3rem] font-medium leading-tight text-ink">
          OneFilm’i yönet.
        </h1>
        <p className="mt-4 max-w-[40ch] animate-rise-delayed-2 text-center text-[15px] leading-7 text-ash">
          Ödemeyi başlatmak, e-posta gönderimini sürdürmek veya faturalandırmayı yönetmek için e-postanı ara.
        </p>
        <FilmSubscribeLookup initialEmail={searchParams.email ?? ""} />
      </section>
      <Footer showBackHome backHref="/film" backLabel="Back to OneFilm" />
    </main>
  );
}
