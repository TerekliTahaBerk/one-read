import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { NewsSubscribeLookup } from "@/components/NewsSubscribeLookup";
import { productThemes } from "@/lib/product-themes";

export const metadata: Metadata = {
  title: "Abonelik - OneNews",
  description: "OneNews aboneliğini başlat veya yönet.",
};

export default function NewsSubscribePage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
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
        } as CSSProperties
      }
    >
      <header className="flex w-full justify-center animate-rise">
        <Logo label="OneNews" href="/news" ariaLabel="OneNews home" />
      </header>
      <section className="mx-auto my-auto flex w-full max-w-[36rem] flex-col items-center py-8 sm:py-10">
        <h1 className="animate-rise-delayed text-center font-serif text-[2.3rem] font-medium leading-tight text-ink">
          OneNews’i yönet.
        </h1>
        <p className="mt-4 max-w-[40ch] animate-rise-delayed-2 text-center text-[15px] leading-7 text-ash">
          Ödemeyi başlatmak, e-posta gönderimini sürdürmek veya faturalandırmayı yönetmek için e-postanı ara.
        </p>
        <NewsSubscribeLookup initialEmail={searchParams.email ?? ""} />
      </section>
      <Footer showBackHome backHref="/news" backLabel="Back to OneNews" />
    </main>
  );
}
