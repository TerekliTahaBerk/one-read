"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

const COPY = {
  en: {
    eyebrow: "Independent and accountable",
    title: "A human editor stands behind every edition.",
    intro: "OneRead is an early-stage independent editorial project operated from Türkiye. We do not publish invented subscriber counts or anonymous testimonials.",
    cards: [
      ["Human reviewed", "Every edition is written, checked, previewed, and manually scheduled before delivery."],
      ["Sources shown", "Article notes link to the original work. Film facts and image credits must be verifiable."],
      ["Corrections welcome", "Questions and correction requests go directly to hello@oneread.email."],
    ],
    standards: "Read our editorial standards",
    article: "View a full OneArticle sample",
    film: "View a full OneFilm sample",
  },
  tr: {
    eyebrow: "Bağımsız ve hesap verebilir",
    title: "Her gönderinin arkasında bir insan editör var.",
    intro: "OneRead, Türkiye’den işletilen erken aşama bağımsız bir editoryal projedir. Uydurma abone sayıları veya anonim yorumlar yayımlamayız.",
    cards: [
      ["İnsan kontrolü", "Her gönderi teslimattan önce yazılır, kontrol edilir, önizlenir ve manuel olarak zamanlanır."],
      ["Kaynaklar açık", "Makale notları özgün esere bağlanır. Film bilgileri ve görsel kredileri doğrulanabilir olmalıdır."],
      ["Düzeltmeye açık", "Sorular ve düzeltme talepleri doğrudan hello@oneread.email adresine ulaşır."],
    ],
    standards: "Editoryal standartlarımızı oku",
    article: "Tam OneArticle örneğini gör",
    film: "Tam OneFilm örneğini gör",
  },
  de: {
    eyebrow: "Unabhängig und verantwortlich",
    title: "Hinter jeder Ausgabe steht ein menschlicher Redakteur.",
    intro: "OneRead ist ein unabhängiges Projekt in einer frühen Phase, betrieben aus Türkiye. Wir veröffentlichen keine erfundenen Abonnentenzahlen oder anonymen Bewertungen.",
    cards: [
      ["Menschlich geprüft", "Jede Ausgabe wird geschrieben, geprüft, als Vorschau kontrolliert und manuell geplant."],
      ["Quellen sichtbar", "Artikel verlinken das Original; Filmdaten und Bildnachweise müssen überprüfbar sein."],
      ["Korrekturen willkommen", "Hinweise erreichen uns direkt unter hello@oneread.email."],
    ],
    standards: "Redaktionelle Standards lesen",
    article: "Vollständiges OneArticle-Beispiel",
    film: "Vollständiges OneFilm-Beispiel",
  },
  fr: {
    eyebrow: "Indépendant et responsable",
    title: "Un éditeur humain répond de chaque édition.",
    intro: "OneRead est un projet éditorial indépendant en phase initiale, exploité depuis la Türkiye. Nous ne publions ni faux chiffres d'abonnés ni témoignages anonymes.",
    cards: [
      ["Vérification humaine", "Chaque édition est rédigée, contrôlée, prévisualisée et programmée manuellement."],
      ["Sources visibles", "Les articles renvoient à l'original ; les faits cinéma et crédits image doivent être vérifiables."],
      ["Corrections ouvertes", "Les demandes arrivent directement à hello@oneread.email."],
    ],
    standards: "Lire nos normes éditoriales",
    article: "Voir l'exemple OneArticle complet",
    film: "Voir l'exemple OneFilm complet",
  },
} as const;

export function EditorialTrust() {
  const { locale } = useSiteLanguage();
  const copy = COPY[locale];
  return (
    <section className="mt-12 w-full border-t border-line/80 pt-9 text-center sm:mt-14 sm:pt-10">
      <p className="font-sans text-[10.5px] uppercase tracking-eyebrow text-fog">{copy.eyebrow}</p>
      <h2 className="mx-auto mt-3 max-w-[22ch] font-serif text-[1.8rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[2.15rem]">
        {copy.title}
      </h2>
      <p className="mx-auto mt-3 max-w-[56ch] font-sans text-[14px] leading-[1.65] text-ash">{copy.intro}</p>
      <div className="mt-7 grid gap-3 text-left sm:grid-cols-3">
        {copy.cards.map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-line bg-white/60 p-5">
            <h3 className="font-serif text-[1.05rem] font-medium text-ink">{title}</h3>
            <p className="mt-2 font-sans text-[13px] leading-[1.6] text-ash">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 font-sans text-[13px]">
        <Link href="/editorial" className="link-underline text-ink">{copy.standards}</Link>
        <Link href="/samples/article" className="link-underline text-ink">{copy.article}</Link>
        <Link href="/samples/film" className="link-underline text-ink">{copy.film}</Link>
      </div>
    </section>
  );
}
