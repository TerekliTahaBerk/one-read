import Link from "next/link";

type Props = {
  /** Show the Pricing link (homepage). Pricing page hides it. */
  showPricing?: boolean;
  pricingHref?: string;
  tagline?: string;
  xAriaLabel?: string;
  /** Show a quiet back link (pricing/legal pages). */
  showBackHome?: boolean;
  backHref?: string;
  backLabel?: string;
};

export function Footer({
  showPricing = false,
  pricingHref = "/pricing",
  tagline = "No feeds. No noise. Just one good read.",
  xAriaLabel = "OneRead on X",
  showBackHome = false,
  backHref = "/",
  backLabel = "Back to OneRead",
}: Props) {
  return (
    <footer className="w-full pt-6 pb-1 sm:pb-2 flex flex-col items-center text-center animate-rise-delayed-4">
      <p className="font-serif italic text-[13.5px] sm:text-[14px] text-ash">
        {tagline}
      </p>
      <nav
        aria-label="Footer"
        className="mt-3 flex items-center gap-3 text-[12px] text-fog font-sans"
      >
        <Link
          href="/privacy"
          className="link-underline transition-colors duration-200 hover:text-ink"
        >
          Privacy
        </Link>
        <span aria-hidden="true" className="text-line-strong">·</span>
        <Link
          href="/terms"
          className="link-underline transition-colors duration-200 hover:text-ink"
        >
          Terms
        </Link>
        <span aria-hidden="true" className="text-line-strong">·</span>
        <a
          href="#"
          className="link-underline transition-colors duration-200 hover:text-ink"
          aria-label={xAriaLabel}
        >
          X
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
    </footer>
  );
}
