import Link from "next/link";

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
  return (
    <>
      <footer className="w-full pt-6 pb-1 sm:pb-2 flex flex-col items-center text-center animate-rise-delayed-4">
        <p className="font-serif italic text-[13.5px] sm:text-[14px] text-ash">
          {tagline}
        </p>

        {showManifesto && (
          <p className="mt-2 max-w-[40ch] font-sans text-[12.5px] leading-[1.55] text-fog">
            For people who want better inputs without another app to open.
          </p>
        )}

        <nav
          aria-label="Footer"
          className="mt-3 flex flex-wrap items-center justify-center gap-3 text-[12px] text-fog font-sans"
        >
          <Link
            href="/terms"
            className="link-underline transition-colors duration-200 hover:text-ink"
          >
            Terms
          </Link>
          <span aria-hidden="true" className="text-line-strong">·</span>
          <Link
            href="/privacy"
            className="link-underline transition-colors duration-200 hover:text-ink"
          >
            Privacy
          </Link>
          {showPricing && (
            <>
              <span aria-hidden="true" className="text-line-strong">·</span>
              <Link
                href={pricingHref}
                className="link-underline transition-colors duration-200 hover:text-ink"
              >
                Pricing
              </Link>
            </>
          )}
        </nav>
        {showBackHome && (
          <Link
            href={backHref}
            className="mt-4 link-underline text-[12px] text-fog font-sans transition-colors duration-200 hover:text-ink"
          >
            {backLabel}
          </Link>
        )}
      </footer>

      <a
        href="#tally-open=PdPQl1&tally-emoji-text=👋&tally-emoji-animation=wave"
        data-tally-open="PdPQl1"
        data-tally-emoji-text="👋"
        data-tally-emoji-animation="wave"
        aria-label="Open feedback form"
        title="Feedback"
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
