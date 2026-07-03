import Link from "next/link";

type Props = {
  href: string;
  label: string;
  className?: string;
};

/**
 * Circular back-arrow button. Meant to sit inside a `relative` header next to
 * a centered `<Logo />`, absolute-positioned to the left. Shared so every page
 * uses the same affordance instead of relying on the Footer's text-only
 * "Back to X" link alone.
 */
export function BackButton({ href, label, className = "" }: Props) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`focus-ring absolute left-0 top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full text-ash transition-colors duration-200 hover:text-ink hover:bg-[var(--theme-surface)] ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path
          d="M12 7H2M6 3L2 7l4 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
