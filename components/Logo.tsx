import Link from "next/link";

type Props = {
  /** When false, renders the logo without a link wrapper. */
  href?: string | null;
  label?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * One Read logo lockup.
 *
 * Rendered as live text in the brand serif (Fraunces) rather than a raster
 * asset, so the wordmark stays perfectly crisp at any size or pixel density and
 * matches the typography used across the rest of the page. The optical sizing
 * and tight tracking give it the high-contrast, editorial Didone feel.
 *
 * Defaults to linking home so it can double as the (intentionally minimal)
 * site navigation. Pass `href={null}` to render a non-interactive logo.
 */
export function Logo({
  href = "/",
  label = "One Read",
  ariaLabel,
  className = "",
}: Props) {
  const wordmark = (
    <span
      aria-hidden="true"
      className="
        font-serif font-medium
        text-[1.5rem] sm:text-[1.75rem]
        leading-none tracking-[-0.015em]
        text-ink select-none
        [font-optical-sizing:auto]
      "
    >
      {label}
    </span>
  );

  if (href === null) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        {wordmark}
        <span className="sr-only">{ariaLabel ?? label}</span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel ?? `${label} — home`}
      className={`focus-ring inline-flex items-center justify-center rounded-full px-2 py-1 ${className}`}
    >
      {wordmark}
    </Link>
  );
}
