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
  /** Show the small OneRead brand line (homepage). */
  showManifesto?: boolean;
  /** Show the public product links row. Hidden products stay out of this list. */
  showProducts?: boolean;
};

const PRODUCT_LINKS = [
  { label: "OneArticle", href: "/article", external: false },
  { label: "OneFilm", href: "/film", external: false },
  { label: "OneNews", href: "/news", external: false },
] as const;

export function Footer({
  showPricing = false,
  pricingHref = "/pricing",
  tagline = "No feeds. No noise. Just one good read.",
  xAriaLabel = "OneRead on X",
  showBackHome = false,
  backHref = "/",
  backLabel = "Back to OneRead",
  showManifesto = false,
  showProducts = false,
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

      {showProducts && (
        <nav
          aria-label="Products"
          className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[12px] text-fog font-sans"
        >
          {PRODUCT_LINKS.map((p, i) => (
            <span key={p.label} className="flex items-center gap-3">
              {i > 0 && (
                <span aria-hidden="true" className="text-line-strong">
                  ·
                </span>
              )}
              {p.external ? (
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-underline transition-colors duration-200 hover:text-ink"
                >
                  {p.label}
                </a>
              ) : (
                <Link
                  href={p.href}
                  className="link-underline transition-colors duration-200 hover:text-ink"
                >
                  {p.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
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
          href="https://tally.so/r/PdPQl1"
          target="_blank"
          rel="noopener noreferrer"
          className="link-underline transition-colors duration-200 hover:text-ink"
        >
          Feedback
        </a>
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
