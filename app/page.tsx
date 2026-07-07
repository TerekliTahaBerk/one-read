"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { HomeReveal } from "@/components/HomeReveal";
import { Logo } from "@/components/Logo";
import { OneReadFamilyMascots } from "@/components/OneReadFamilyMascots";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

export default function HomePage() {
  const { dictionary } = useSiteLanguage();

  return (
    <main
      className="
        relative min-h-svh w-full
        flex flex-col items-center
        px-5 sm:px-6
        pt-5 sm:pt-6
        pb-4 sm:pb-5
      "
    >
      <HomeReveal>
        <header className="relative w-full flex justify-center reveal-item">
          <Logo href="/" />

          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/preferences"
              className="
                focus-ring link-underline rounded-full px-2.5 py-1
                font-sans text-[13px] text-ash
                transition-colors duration-200 hover:text-ink
              "
            >
              {dictionary.common.login}
            </Link>
            <Link
              href="/blog"
              aria-label={dictionary.common.blog}
              title={dictionary.common.blog}
              className="
                focus-ring inline-flex h-9 w-9 items-center justify-center
                rounded-full text-ash
                transition-colors duration-200 hover:text-ink hover:bg-cream
              "
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3.25"
                  y="4.25"
                  width="13.5"
                  height="11.5"
                  rx="1.75"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M6.25 8h7.5M6.25 10.75h7.5M6.25 13.5h4.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </div>
        </header>

        <section
          className="
            flex-1 w-full
            flex flex-col items-center justify-center
            max-w-[54rem] mx-auto
            py-10 sm:py-14
          "
        >
          <h1
            className="
              font-serif font-medium
              text-[2.45rem] leading-[1.02]
              sm:text-[3.55rem] sm:leading-[0.99]
              tracking-[-0.026em]
              text-ink text-center text-balance
              max-w-[16ch]
              reveal-item reveal-item-2
            "
          >
            {dictionary.home.title}
          </h1>

          <p
            className="
              font-sans
              text-[15px] sm:text-[16px] leading-[1.65]
              text-ash text-center text-pretty
              mt-4 sm:mt-5
              max-w-[48ch]
              reveal-item reveal-item-3
            "
          >
            {dictionary.home.intro}
          </p>

          <div
            className="
              mt-7 sm:mt-8 flex w-full flex-col items-center gap-3
              sm:flex-row sm:justify-center
              reveal-item reveal-item-4
            "
          >
            <Link
              href="/subscribe"
              className="
                focus-ring inline-flex h-12 w-full items-center justify-center
                rounded-full bg-ink px-6 font-sans text-[14px] font-medium
                text-white transition-colors duration-200 hover:bg-ink/90
                sm:w-auto
              "
            >
              {dictionary.common.startOneRead}
            </Link>
          </div>

          <p
            className="
              mt-5 font-sans text-[12.5px] leading-[1.55] text-fog
              text-center reveal-item reveal-item-4
            "
          >
            {dictionary.home.priceNote}
          </p>

          <div className="w-full reveal-item reveal-item-4">
            <OneReadFamilyMascots />
          </div>
        </section>
      </HomeReveal>

      <Footer
        tagline={dictionary.home.tagline}
        showManifesto
        showPricing
      />
    </main>
  );
}
