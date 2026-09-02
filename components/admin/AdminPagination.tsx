import Link from "next/link";

/**
 * Shared previous/next pager for database-paginated admin tables.
 *
 * Filters are carried through so paging never silently widens a result set.
 * Disabled edges render as plain text rather than dead links, and the current
 * position is announced for screen readers.
 */
export function AdminPagination({
  page,
  pages,
  basePath,
  params = {},
}: {
  page: number;
  pages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  const carried = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null && value !== ""),
  ) as Record<string, string>;

  const linkClass =
    "rounded-full border border-admin-line px-3 py-1.5 font-sans text-[13px] text-admin-ink transition-colors hover:bg-admin-sink";
  const mutedClass = "font-sans text-[13px] text-admin-muted";

  return (
    <nav
      aria-label="Pagination"
      className="mb-6 flex items-center justify-between gap-3 sm:mb-7"
    >
      {page > 1 ? (
        <Link
          href={{ pathname: basePath, query: { ...carried, page: page - 1 } }}
          className={linkClass}
          rel="prev"
        >
          ← Newer
        </Link>
      ) : (
        <span className={mutedClass}>← Newer</span>
      )}

      <span aria-live="polite" className={mutedClass}>
        Page {page} of {pages}
      </span>

      {page < pages ? (
        <Link
          href={{ pathname: basePath, query: { ...carried, page: page + 1 } }}
          className={linkClass}
          rel="next"
        >
          Older →
        </Link>
      ) : (
        <span className={mutedClass}>Older →</span>
      )}
    </nav>
  );
}
