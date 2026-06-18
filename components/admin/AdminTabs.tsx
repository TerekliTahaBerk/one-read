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
    <div className="mb-6 flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-sans transition-colors ${
              isActive
                ? "border-ink text-ink font-medium"
                : "border-transparent text-ash hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
