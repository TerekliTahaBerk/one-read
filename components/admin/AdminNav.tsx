"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Left navigation for the admin. Highlights the active section and preserves
 * the `?token=` param on every link so the single-secret auth keeps working
 * across navigations. Intentionally unlinked from any public UI.
 */
const NAV: { href: string; label: string; matchPrefix?: string }[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users", matchPrefix: "/admin/users" },
  { href: "/admin/products", label: "Products" },
  {
    href: "/admin/one-article",
    label: "OneArticle",
    matchPrefix: "/admin/one-article",
  },
  { href: "/admin/settings", label: "Settings" },
];

const SUB_NAV: Record<string, { href: string; label: string }[]> = {
  "/admin/one-article": [
    { href: "/admin/one-article", label: "Overview" },
    { href: "/admin/one-article/subscribers", label: "Subscribers" },
    { href: "/admin/one-article/issues", label: "Issues" },
    { href: "/admin/one-article/articles", label: "Articles" },
    { href: "/admin/one-article/sends", label: "Sends" },
  ],
};

function withToken(href: string, token: string): string {
  const q = new URLSearchParams({ token }).toString();
  return `${href}?${q}`;
}

export function AdminNav({ token }: { token: string }) {
  const pathname = usePathname() ?? "/admin";

  const isActive = (item: (typeof NAV)[number]): boolean => {
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
    return pathname === item.href;
  };

  const activeTop = NAV.find(isActive);
  const sub = activeTop?.matchPrefix ? SUB_NAV[activeTop.matchPrefix] : undefined;

  return (
    <nav className="text-[13px] font-sans">
      <ul className="space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <li key={item.href}>
              <Link
                href={withToken(item.href, token)}
                className={`block rounded-lg px-3 py-1.5 transition-colors ${
                  active
                    ? "bg-cream text-ink font-medium"
                    : "text-ash hover:bg-cream/60 hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
              {active && sub && (
                <ul className="mt-0.5 mb-1 ml-3 space-y-0.5 border-l border-line pl-3">
                  {sub.map((s) => {
                    const subActive = pathname === s.href;
                    return (
                      <li key={s.href}>
                        <Link
                          href={withToken(s.href, token)}
                          className={`block rounded-md px-2 py-1 text-[12.5px] transition-colors ${
                            subActive
                              ? "text-ink font-medium"
                              : "text-fog hover:text-ink"
                          }`}
                        >
                          {s.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
