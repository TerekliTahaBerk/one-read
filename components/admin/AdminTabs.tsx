import Link from "next/link";

/**
 * Lightweight tab strip built from links (so it works in server components and
 * preserves the token). The active tab is passed in explicitly by the page.
 */
export function AdminTabs({
  tabs,
  active,
}: {
  tabs: readonly { key: string; label: string; href: string }[];
  active: string;
}) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-admin-line [scrollbar-width:none]">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 font-sans text-[13px] transition-colors ${
              isActive
                ? "border-admin-accent font-medium text-admin-ink"
                : "border-transparent text-admin-muted hover:text-admin-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
