"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

export function OneArticleMascotArt() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 160 160" className="h-full w-full overflow-visible">
      <g fill="none" stroke="#1A1A1A" strokeLinecap="round" strokeLinejoin="round">
        <path d="M53 103c-7 13-9 23-9 35M44 138l-9 1" strokeWidth="3" />
        <path d="M102 106c-7 11-15 20-24 29" strokeWidth="3" />
        <path className="article-foot-tap" d="M78 135l7 5" strokeWidth="3" />
        <path d="M48 93C34 88 32 72 41 63c-5-12 5-23 18-21 5-13 20-16 29-7 12-7 25 1 24 15 12 4 16 18 8 27 7 11 0 25-13 27-7 12-23 13-32 4-11 7-25 0-27-15Z" fill="#1A1A1A" strokeWidth="2.5" />
        <g className="mascot-eyes">
          <ellipse cx="66" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
          <ellipse cx="91" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
          <circle className="mascot-pupil" cx="66.5" cy="80" r="3.8" fill="#1A1A1A" stroke="none" />
          <circle className="mascot-pupil" cx="87.5" cy="80" r="3.8" fill="#1A1A1A" stroke="none" />
        </g>
        <path className="article-arm-left" d="M49 91c-8 3-13 9-16 17" strokeWidth="3" />
        <path className="article-arm-right" d="M107 92c-12 4-20 11-25 22" strokeWidth="3" />
        <g className="family-object">
          <path d="M24 100l22-7 10 31-22 7Z" fill="#DCEAF5" strokeWidth="2.5" />
          <path d="M46 93l-4 8 10-3M33 108l13-4M36 115l12-4M38 122l10-3" strokeWidth="1.8" />
        </g>
      </g>
    </svg>
  );
}

export function OneReadFamilyMascots() {
  const { dictionary } = useSiteLanguage();

  return (
    <section id="onearticle" aria-labelledby="onearticle-heading" className="mt-12 w-full scroll-mt-8 border-t border-line/80 pt-9 text-center sm:mt-14 sm:pt-10">
      <h2 id="onearticle-heading" className="font-serif text-[1.8rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[2.15rem]">
        {dictionary.family.title}
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] font-sans text-[14px] leading-[1.65] text-ash sm:text-[15px]">{dictionary.family.intro}</p>
      <Link href="/article" aria-label={`OneArticle — ${dictionary.family.article}`} className="family-mascot focus-ring group mx-auto mt-8 block max-w-[18rem] rounded-2xl py-2 text-center transition-opacity duration-200 hover:opacity-75 sm:mt-10">
        <div className="family-mascot-figure mx-auto h-[9.25rem] w-[9.25rem]"><OneArticleMascotArt /></div>
        <h3 className="mt-3 font-serif text-[1.05rem] font-medium leading-tight tracking-[-0.01em] text-ink">OneArticle</h3>
        <p className="mt-1 font-sans text-[12px] leading-[1.45] text-fog">{dictionary.family.article}</p>
      </Link>
    </section>
  );
}
