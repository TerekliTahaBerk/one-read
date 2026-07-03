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
        <span aria-hidden="true" className="text-line-strong">·</span>
        <a
          href="#tally-open=PdPQl1&tally-emoji-text=👋&tally-emoji-animation=wave"
          data-tally-open="PdPQl1"
          data-tally-emoji-text="👋"
          data-tally-emoji-animation="wave"
          className="link-underline transition-colors duration-200 hover:text-ink"
        >
          Feedback
        </a>
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

      <a
        href="#tally-open=PdPQl1&tally-emoji-text=👋&tally-emoji-animation=wave"
        data-tally-open="PdPQl1"
        data-tally-emoji-text="👋"
        data-tally-emoji-animation="wave"
        aria-label="Open feedback form"
        title="Feedback"
        className="focus-ring fixed bottom-4 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-ink text-white shadow-[0_8px_24px_rgba(26,26,26,0.18)] transition-[transform,opacity] duration-200 hover:-translate-y-0.5 hover:opacity-90 sm:bottom-6 sm:right-6"
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M5.5 6.75h13a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-7.75L6.5 21v-2.75h-1a2 2 0 0 1-2-2v-7.5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 12.5h.01M12 12.5h.01M16 12.5h.01"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </a>
    </footer>
  );
}
