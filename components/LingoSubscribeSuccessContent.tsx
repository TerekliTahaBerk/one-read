"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";
import { LEGACY_SUBSCRIBE_DICTIONARIES } from "@/lib/legacy-subscribe-i18n";

export function LingoSubscribeSuccessContent() {
  const { locale } = useSiteLanguage();
  const t = LEGACY_SUBSCRIBE_DICTIONARIES.lingo[locale].success;

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#F5F1FF] px-5 text-center text-ink">
      <div className="max-w-md">
        <div className="font-serif text-[12px] italic uppercase tracking-[0.22em] text-ash">{t.eyebrow}</div>
        <h1 className="mt-8 font-serif text-[32px] font-medium leading-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-[14px] leading-7 text-ash">
          {t.body}
        </p>
        <Link href="/lingo/subscribe" className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#6F5AA8] px-5 text-[14.5px] font-medium text-white">
          {t.cta}
        </Link>
      </div>
    </main>
  );
}
