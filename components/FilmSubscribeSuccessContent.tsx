"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { LEGACY_SUBSCRIBE_DICTIONARIES } from "@/lib/legacy-subscribe-i18n";

export function FilmSubscribeSuccessContent() {
  const { locale } = useSiteLanguage();
  const t = LEGACY_SUBSCRIBE_DICTIONARIES.film[locale].success;

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#F8F4FA] px-5 text-center text-ink">
      <div className="max-w-md">
        <div className="font-serif text-[12px] italic uppercase tracking-[0.22em] text-ash">{t.eyebrow}</div>
        <h1 className="mt-8 font-serif text-[32px] font-medium leading-tight">{t.title}</h1>
        <p className="mt-4 text-[14px] leading-7 text-ash">
          {t.body}
        </p>
        <Link href="/film/subscribe" className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#7B5E8E] px-5 text-[14.5px] font-medium text-white">
          {t.cta}
        </Link>
      </div>
    </main>
  );
}
