import Link from "next/link";

type Props = {
  /** When false, renders the logo without a link wrapper. */
  href?: string | null;
  className?: string;
};

/**
 * One Read logo lockup.
 *
 * Renders the brand asset from `/public/logo.png` (a 4:1 wordmark). Replace
 * that file to update the brand mark everywhere — the component constrains
 * the width and keeps height auto so the asset never stretches or distorts.
 *
 * Defaults to linking home so it can double as the (intentionally minimal)
 * site navigation. Pass `href={null}` to render a non-interactive logo.
 */
export function Logo({ href = "/", className = "" }: Props) {
  const image = (
    <img
      src="/logo.png"
      alt="One Read"
      width={124}
      height={31}
      draggable={false}
      className="h-auto w-[104px] sm:w-[124px] select-none"
    />
  );

  if (href === null) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`}>
        {image}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="One Read — home"
      className={`focus-ring inline-flex items-center justify-center rounded-full px-2 py-1 ${className}`}
    >
      {image}
    </Link>
  );
}
