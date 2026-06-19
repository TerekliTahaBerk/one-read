"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Left navigation for the admin. Highlights the active section. Intentionally
 * unlinked from any public UI.
 */
const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; matchPrefix?: string }[];
}[] = [
  {
    label: "Main",
    items: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/users", label: "Users", matchPrefix: "/admin/users" },
      { href: "/admin/products", label: "Products" },
    ],
  },
  {
    label: "OneArticle",
    items: [
  {
    href: "/admin/one-article",
    label: "OneArticle",
    matchPrefix: "/admin/one-article",
  },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/audit", label: "Audit log", matchPrefix: "/admin/audit" },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

const SUB_NAV: Record<string, { href: string; label: string }[]> = {
  "/admin/one-article": [
    { href: "/admin/one-article", label: "Overview" },
    { href: "/admin/one-article/subscribers", label: "Subscribers" },
    { href: "/admin/one-article/issues", label: "Issues" },
    { href: "/admin/one-article/articles", label: "Articles" },
    { href: "/admin/one-article/sends", label: "Sends" },
  ],
};

export function AdminNav() {
  const pathname = usePathname() ?? "/admin";

  const isActive = (item: (typeof NAV)[number]): boolean => {
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
    return pathname === item.href;
  };

  const activeTop = NAV.find(isActive);
  const sub = activeTop?.matchPrefix ? SUB_NAV[activeTop.matchPrefix] : undefined;

  return (
    <nav className="text-[13px] font-sans">
      <ul className="space-y-4">
        {NAV_GROUPS.map((group) => (
          <li key={group.label}>
            <div className="px-3 pb-1 text-[10px] uppercase tracking-eyebrow text-fog">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
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
                                href={s.href}
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
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-line pt-3">
        {/*
          Logout is a POST form, never a <Link>. A GET/prefetchable logout link
          would be hit by Next.js prefetch and clear the session in the
          background right after login. method="post" with full navigation lets
          the route handler 303-redirect to /admin/login.
        */}
        <form action="/admin/logout" method="post">
          <button
            type="submit"
            className="block w-full rounded-lg px-3 py-1.5 text-left text-ash transition-colors hover:bg-cream/60 hover:text-ink"
          >
            Logout
          </button>
        </form>
      </div>
    </nav>
  );
}
