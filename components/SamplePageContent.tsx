"use client";

import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { SampleIssuePreview } from "@/components/SampleIssuePreview";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

const COPY = {
  en: {
    articleTitle: "A complete OneArticle sample",
    articleIntro: "Read a full example from subject line to source note before subscribing.",
    sample: "Live sample",
  },
  tr: {
    articleTitle: "Tam OneArticle örneği",
    articleIntro: "Abone olmadan önce konu satırından kaynak notuna kadar tam bir örneği oku.",
    sample: "Canlı örnek",
  },
  de: {
    articleTitle: "Ein vollständiges OneArticle-Beispiel",
    articleIntro: "Lesen Sie vor dem Abonnement ein vollständiges Beispiel von der Betreffzeile bis zur Quellenangabe.",
    sample: "Live-Beispiel",
  },
  fr: {
    articleTitle: "Un exemple OneArticle complet",
    articleIntro: "Lisez un exemple complet, de l'objet à la note de source, avant de vous abonner.",
    sample: "Exemple en direct",
  },
} as const;

export function SamplePageContent() {
  const { locale, dictionary } = useSiteLanguage();
  const copy = COPY[locale];

  return (
    <main className="relative flex min-h-svh w-full flex-col items-center px-5 pb-6 pt-6 sm:px-6 sm:pt-7">
      <header className="relative flex w-full justify-center">
        <BackButton href="/article" label={dictionary.common.backToOneRead} />
        <Logo label="OneArticle" href="/article" />
      </header>

      <article className="mx-auto w-full max-w-[42rem] flex-1 pt-10 sm:pt-14">
        <p className="font-sans text-[11px] uppercase tracking-eyebrow text-fog">{copy.sample}</p>
        <h1 className="mt-3 max-w-[20ch] font-serif text-[2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-[2.6rem]">
          {copy.articleTitle}
        </h1>
        <p className="mt-4 max-w-[46ch] font-sans text-[15px] leading-[1.7] text-ash">
          {copy.articleIntro}
        </p>
        <div className="mt-8">
          <SampleIssuePreview defaultOpen hideToggle />
        </div>
      </article>
      <Footer showBackHome />
    </main>
  );
}
