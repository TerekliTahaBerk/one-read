import Link from "next/link";

type Props = {
  /** Show the Pricing link (homepage). Pricing page hides it. */
  showPricing?: boolean;
  /** Show a quiet "Back to One Read" link (pricing page). */
  showBackHome?: boolean;
};

export function Footer({ showPricing = false, showBackHome = false }: Props) {
  return (
    <footer className="w-full pt-8 pb-2 sm:pb-4 flex flex-col items-center text-center animate-rise-delayed-4">
      <p className="font-serif italic text-[13.5px] sm:text-[14px] text-ash">
        No feeds. No noise. Just one good read.
      </p>
      <nav
        aria-label="Footer"
        className="mt-3 flex items-center gap-3 text-[12px] text-fog font-sans"
      >
        <a
          href="#"
          className="link-underline transition-colors duration-200 hover:text-ink"
        >
          Privacy
        </a>
        <span aria-hidden="true" className="text-line-strong">·</span>
        <a
          href="#"
          className="link-underline transition-colors duration-200 hover:text-ink"
        >
          Terms
        </a>
        <span aria-hidden="true" className="text-line-strong">·</span>
        <a
          href="#"
          className="link-underline transition-colors duration-200 hover:text-ink"
          aria-label="One Read on X"
        >
          X
        </a>
        {showPricing && (
          <>
            <span aria-hidden="true" className="text-line-strong">·</span>
            <Link
              href="/pricing"
              className="link-underline transition-colors duration-200 hover:text-ink"
            >
              Pricing
            </Link>
          </>
        )}
      </nav>
      {showBackHome && (
        <Link
          href="/"
          className="mt-4 link-underline text-[12px] text-fog font-sans transition-colors duration-200 hover:text-ink"
        >
          Back to One Read
        </Link>
      )}
    </footer>
  );
}
