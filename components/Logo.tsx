import Image from "next/image";
import Link from "next/link";

type Props = {
  /** When false, renders the logo without a link wrapper. */
  href?: string | null;
  label?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * OneRead logo lockup.
 *
 * The default "OneRead" mark renders the illustrated wordmark (the reading
 * mascot) as a raster asset — it's a specific piece of artwork, not typesetting.
 * Other product labels (OneArticle, OneFilm, OneLingo, …) still render as live
 * text in the brand serif (Fraunces) since they don't have their own mark yet.
 *
 * Defaults to linking home so it can double as the (intentionally minimal)
 * site navigation. Pass `href={null}` to render a non-interactive logo.
 */
export function Logo({
  href = "/",
  label = "OneRead",
  ariaLabel,
  className = "",
}: Props) {
  const mark =
    label === "OneRead" ? (
      <Image
        src="/oneread-logo.png"
        alt=""
        aria-hidden="true"
        width={1057}
        height={250}
        priority
        className="h-[28px] sm:h-[34px] w-auto select-none"
      />
    ) : (
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
        {mark}
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
      {mark}
    </Link>
  );
}
