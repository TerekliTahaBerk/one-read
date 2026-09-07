"use client";

import type { CSSProperties, ReactNode } from "react";
import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { NewsEditionPreview } from "@/components/NewsEditionPreview";
import { SampleIssuePreview } from "@/components/SampleIssuePreview";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { productThemes } from "@/lib/product-themes";

const COPY = {
  en: {
    articleTitle: "A complete OneArticle sample",
    articleIntro: "Read a full example from subject line to source note before subscribing.",
    newsTitle: "A complete OneNews edition",
    newsIntro:
      "Read a full edition — what happened, why it matters, what to watch, and the sources behind it — before subscribing.",
    sample: "Live sample",
  },
  tr: {
    articleTitle: "Tam OneArticle örneği",
    articleIntro: "Abone olmadan önce konu satırından kaynak notuna kadar tam bir örneği oku.",
    newsTitle: "Tam bir OneNews sayısı",
    newsIntro:
      "Abone olmadan önce tam bir sayıyı oku — ne oldu, neden önemli, neye bakmalı ve arkasındaki kaynaklar.",
    sample: "Canlı örnek",
  },
  de: {
    articleTitle: "Ein vollständiges OneArticle-Beispiel",
    articleIntro: "Lesen Sie vor dem Abonnement ein vollständiges Beispiel von der Betreffzeile bis zur Quellenangabe.",
    newsTitle: "Eine vollständige OneNews-Ausgabe",
    newsIntro:
      "Lesen Sie vor dem Abonnement eine vollständige Ausgabe — was geschehen ist, warum es zählt, worauf zu achten ist und die Quellen dahinter.",
    sample: "Live-Beispiel",
  },
  fr: {
    articleTitle: "Un exemple OneArticle complet",
    articleIntro: "Lisez un exemple complet, de l'objet à la note de source, avant de vous abonner.",
    newsTitle: "Une édition OneNews complète",
    newsIntro:
      "Lisez une édition complète — ce qui s'est passé, pourquoi cela compte, ce qu'il faut surveiller et les sources qui la fondent — avant de vous abonner.",
    sample: "Exemple en direct",
  },
} as const;

type SampleProduct = "article" | "news";

/**
 * The shell shared by both full-sample pages: centered header, back link to
 * the product landing, product logo, eyebrow, title, intro, then the sample
 * itself, then the footer. Only the inner sample differs — OneArticle's issue
 * format and OneNews's edition structure are genuinely different editorial
 * objects and stay that way.
 *
 * OneArticle deliberately carries no theme variables here: its sample page has
 * always rendered on the plain OneRead chrome, and changing that would be a
 * redesign of a page this shell was extracted to leave alone.
 */
export function SamplePageContent({
  product = "article",
  cta,
}: {
  product?: SampleProduct;
  /** Optional call-to-action row rendered under the sample. */
  cta?: ReactNode;
}) {
  const { locale, dictionary } = useSiteLanguage();
  const copy = COPY[locale];
  const isNews = product === "news";

  const theme = isNews ? productThemes.news : null;
  const themeStyle = theme
    ? ({
        "--theme-accent": theme.accent,
        "--theme-border": theme.border,
        "--theme-surface": theme.surface,
        "--theme-selected-surface": theme.selectedSurface,
        "--theme-focus": theme.accent,
      } as CSSProperties)
    : undefined;

  const sample: ReactNode = isNews ? (
    <NewsEditionPreview defaultOpen hideToggle showFullSampleLink={false} />
  ) : (
    <SampleIssuePreview defaultOpen hideToggle />
  );

  return (
    <main
      className="relative flex min-h-svh w-full flex-col items-center px-5 pb-6 pt-6 sm:px-6 sm:pt-7"
      style={themeStyle}
    >
      <header className="relative flex w-full justify-center">
        <BackButton
          href={isNews ? "/news" : "/article"}
          label={dictionary.common.backToOneRead}
        />
        <Logo label={isNews ? "OneNews" : "OneArticle"} href={isNews ? "/news" : "/article"} />
      </header>

      <article className="mx-auto w-full max-w-[42rem] flex-1 pt-10 sm:pt-14">
        <p className="font-sans text-[11px] uppercase tracking-eyebrow text-fog">{copy.sample}</p>
        <h1 className="mt-3 max-w-[20ch] font-serif text-[2rem] font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-[2.6rem]">
          {isNews ? copy.newsTitle : copy.articleTitle}
        </h1>
        <p className="mt-4 max-w-[46ch] font-sans text-[15px] leading-[1.7] text-ash">
          {isNews ? copy.newsIntro : copy.articleIntro}
        </p>
        <div className="mt-8">{sample}</div>
        {cta && <div className="mt-8">{cta}</div>}
      </article>
      <Footer showBackHome />
    </main>
  );
}
