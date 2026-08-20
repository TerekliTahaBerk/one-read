"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";

const COPY = {
  en: { eyebrow: "Subscription active", title: "Welcome to OneArticle.", body: "Your preferences are saved. Your next editor-approved article briefing will arrive by email.", cta: "Manage preferences", backLabel: "Back to OneArticle", ariaLabel: "OneArticle — OneRead home" },
  tr: { eyebrow: "Abonelik aktif", title: "OneArticle'a hoş geldin.", body: "Tercihlerin kaydedildi. Editör onaylı bir sonraki makale özeti e-postana gelecek.", cta: "Tercihleri yönet", backLabel: "OneArticle'a dön", ariaLabel: "OneArticle — OneRead ana sayfası" },
  de: { eyebrow: "Abonnement aktiv", title: "Willkommen bei OneArticle.", body: "Ihre Präferenzen sind gespeichert. Das nächste redaktionell freigegebene Artikelbriefing kommt per E-Mail.", cta: "Präferenzen verwalten", backLabel: "Zurück zu OneArticle", ariaLabel: "OneArticle — OneRead-Startseite" },
  fr: { eyebrow: "Abonnement actif", title: "Bienvenue dans OneArticle.", body: "Vos préférences sont enregistrées. La prochaine note article validée par l'éditeur arrivera par e-mail.", cta: "Gérer les préférences", backLabel: "Retour à OneArticle", ariaLabel: "OneArticle — accueil OneRead" },
} as const;

export function ArticleSubscribeSuccessContent() {
  const { locale } = useSiteLanguage();
  const t = COPY[locale];
  const theme = productThemes.article;

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
        <BackButton href="/article" label={t.backLabel} />
        <Logo label="OneArticle" href="/" ariaLabel={t.ariaLabel} />
      </header>

      <section className="w-full flex flex-col items-center max-w-[34rem] mx-auto py-8 sm:py-10 my-auto text-center">
        <p className="font-sans text-[11px] uppercase tracking-eyebrow text-fog">
          {t.eyebrow}
        </p>
        <h1 className="font-serif font-medium text-[2rem] leading-[1.08] sm:text-[2.5rem] sm:leading-[1.06] text-ink mt-3">
          {t.title}
        </h1>
        <p className="font-sans text-[15px] sm:text-[15.5px] leading-[1.65] text-ash mt-5 max-w-[42ch]">
          {t.body}
        </p>
        <Link
          href="/preferences"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-[var(--theme-accent)] px-5 font-sans text-[15px] text-white"
        >
          {t.cta}
        </Link>
      </section>

      <Footer showBackHome backHref="/article" backLabel={t.backLabel} />
    </main>
  );
}
