"use client";

import Link from "next/link";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useSiteLanguage } from "@/components/SiteLanguageProvider";

type Props = {
  /** Show the Pricing link (homepage). Pricing page hides it. */
  showPricing?: boolean;
  pricingHref?: string;
  tagline?: string;
  /** Show a quiet back link (pricing/legal pages). */
  showBackHome?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Show the small OneRead brand line (homepage). */
  showManifesto?: boolean;
};

export function Footer({
  showPricing = false,
  pricingHref = "/pricing",
  tagline = "No feeds. No noise. Just one good read.",
  showBackHome = false,
  backHref = "/",
  backLabel = "Back to OneRead",
  showManifesto = false,
}: Props) {
  const { dictionary } = useSiteLanguage();
  const resolvedTagline = tagline === "No feeds. No noise. Just one good read."
    ? dictionary.footer.defaultTagline
    : tagline;
  const resolvedBackLabel = backLabel === "Back to OneRead"
    ? dictionary.common.backToOneRead
    : backLabel;

  return (
    <>
      <footer className="w-full pt-6 pb-1 sm:pb-2 flex flex-col items-center text-center animate-rise-delayed-4">
        <p className="font-serif italic text-[13.5px] sm:text-[14px] text-ash">
          {resolvedTagline}
        </p>

        {showManifesto && (
          <p className="mt-2 max-w-[40ch] font-sans text-[12.5px] leading-[1.55] text-fog">
            {dictionary.footer.manifesto}
          </p>
        )}

        <nav
          aria-label={dictionary.footer.navigation}
          className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[12px] text-fog font-sans"
        >
          <Link
            href="/terms"
            className="link-underline transition-colors duration-200 hover:text-ink"
          >
            {dictionary.footer.terms}
          </Link>
          <span aria-hidden="true" className="text-line-strong">·</span>
          <Link
            href="/privacy"
            className="link-underline transition-colors duration-200 hover:text-ink"
          >
            {dictionary.footer.privacy}
          </Link>
          {showPricing && (
            <>
              <span aria-hidden="true" className="text-line-strong">·</span>
              <Link
                href={pricingHref}
                className="link-underline transition-colors duration-200 hover:text-ink"
              >
                {dictionary.footer.pricing}
              </Link>
            </>
          )}
          <span aria-hidden="true" className="text-line-strong">·</span>
          <LanguageSwitcher />
        </nav>
        {showBackHome && (
          <Link
            href={backHref}
            className="mt-4 link-underline text-[12px] text-fog font-sans transition-colors duration-200 hover:text-ink"
          >
            {resolvedBackLabel}
          </Link>
        )}
      </footer>

      <a
        href="#tally-open=PdPQl1&tally-emoji-text=👋&tally-emoji-animation=wave"
        data-tally-open="PdPQl1"
        data-tally-emoji-text="👋"
        data-tally-emoji-animation="wave"
        aria-label={dictionary.footer.feedback}
        title={dictionary.footer.feedback}
        className="feedback-launcher focus-ring fixed z-50 inline-flex h-12 w-12 select-none items-center justify-center rounded-full sm:h-[52px] sm:w-[52px]"
      >
        <span
          aria-hidden="true"
          className="feedback-wave text-[24px] leading-none sm:text-[26px]"
        >
          👋
        </span>
      </a>
    </>
  );
}
