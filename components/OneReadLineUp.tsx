"use client";

import type { ReactNode } from "react";
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

/**
 * OneNews shares OneArticle's scalloped body, eye proportions and thin limbs.
 * Its gaze and folded newspaper on the right distinguish the news reader.
 */
export function OneNewsMascotArt() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 160 160" className="h-full w-full overflow-visible">
      <g fill="none" stroke="#1A1A1A" strokeLinecap="round" strokeLinejoin="round">
        <path d="M66 102c-5 12-7 23-6 34M60 137l-9 1" strokeWidth="3" />
        <path d="M92 102c3 11 4 21 3 31M95 133l8 4" strokeWidth="3" />
        <path d="M48 93C34 88 32 72 41 63c-5-12 5-23 18-21 5-13 20-16 29-7 12-7 25 1 24 15 12 4 16 18 8 27 7 11 0 25-13 27-7 12-23 13-32 4-11 7-25 0-27-15Z" fill="#1A1A1A" strokeWidth="2.5" />
        <g className="mascot-eyes">
          <ellipse cx="66" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
          <ellipse cx="91" cy="75" rx="11" ry="14" fill="#FFFFFF" strokeWidth="1.5" />
          <circle className="mascot-pupil" cx="69.5" cy="80" r="3.8" fill="#1A1A1A" stroke="none" />
          <circle className="mascot-pupil" cx="94.5" cy="80" r="3.8" fill="#1A1A1A" stroke="none" />
        </g>
        <path className="news-arm-left" d="M45 90c-10 3-16 9-19 17" strokeWidth="3" />
        <path className="news-arm-right" d="M113 90c4 4 5 8 2 13" strokeWidth="3" />
        <g className="family-object">
          <g className="news-sheet">
            <path d="M110 100l30 6-5 30-30-6Z" fill="#EFEAE1" strokeWidth="2.5" />
            <path d="M125 103l-5 30" strokeWidth="1.5" />
            <path d="M113 106l22 4.4" strokeWidth="2.2" />
            <path d="M112 115l8 1.6M111 121l8 1.6M111 127l8 1.6M127 118l8 1.6M126 124l8 1.6M126 130l8 1.6" strokeWidth="1.6" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * The heading for the line-up on the homepage, and the two products drawn as
 * characters underneath it. OneRead is the parent brand and has no character
 * of its own: it is the row, not a third figure in it. The mascots replaced
 * the offer cards that used to sit here, so the copy under each one stays to a
 * few words — the pricing page is where a reader goes to compare.
 */
export function OneReadLineUp() {
  const { dictionary } = useSiteLanguage();

  return (
    <section id="products" aria-labelledby="products-heading" className="mt-12 w-full scroll-mt-8 border-t border-line/80 pt-9 text-center sm:mt-14 sm:pt-10">
      <h2 id="products-heading" className="font-serif text-[1.8rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[2.15rem]">
        {dictionary.lineUp.title}
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] font-sans text-[14px] leading-[1.65] text-ash sm:text-[15px]">{dictionary.lineUp.intro}</p>
      <div className="mx-auto mt-8 grid max-w-[36rem] grid-cols-2 items-start gap-2 sm:mt-10 sm:gap-8">
        <MascotLink
          href="/article"
          name="OneArticle"
          label={dictionary.lineUp.article}
          className="family-mascot-article"
          art={<OneArticleMascotArt />}
        />
        <MascotLink
          href="/news"
          name="OneNews"
          label={dictionary.lineUp.news}
          className="family-mascot-news"
          art={<OneNewsMascotArt />}
        />
      </div>
    </section>
  );
}

/**
 * One product as a character. The link wraps the whole figure so the target is
 * large on a phone, and the name is a real heading so the row is navigable
 * without seeing the drawings at all.
 */
function MascotLink({ href, name, label, className, art }: { href: string; name: string; label: string; className: string; art: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={`${name} — ${label}`}
      className={`family-mascot focus-ring block min-w-0 rounded-2xl py-2 text-center transition-opacity duration-200 hover:opacity-75 ${className}`}
    >
      <div className="family-mascot-figure mx-auto h-[5.75rem] w-[5.75rem] sm:h-[9.25rem] sm:w-[9.25rem]">{art}</div>
      <h3 className="mt-3 font-serif text-[1.05rem] font-medium leading-tight tracking-[-0.01em] text-ink">{name}</h3>
      <p className="mt-1 font-sans text-[12px] leading-[1.45] text-fog">{label}</p>
    </Link>
  );
}
