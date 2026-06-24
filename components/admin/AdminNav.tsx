"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Left navigation for the admin. Highlights the active section. Intentionally
 * unlinked from any public UI.
 */
const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; matchPrefix?: string; badge?: string }[];
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
    label: "OneLingo",
    items: [
      {
        href: "/admin/one-lingo",
        label: "OneLingo",
        matchPrefix: "/admin/one-lingo",
        badge: "Hidden",
      },
    ],
  },
  {
    label: "OneNews",
    items: [
      { href: "/admin/one-news", label: "OneNews", matchPrefix: "/admin/one-news", badge: "Hidden" },
    ],
  },
  {
    label: "OneFilm",
    items: [
      { href: "/admin/one-film", label: "OneFilm", matchPrefix: "/admin/one-film", badge: "Hidden" },
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
  "/admin/one-lingo": [
    { href: "/admin/one-lingo", label: "Overview" },
    { href: "/admin/one-lingo/subscribers", label: "Subscribers" },
    { href: "/admin/one-lingo/lessons", label: "Lessons" },
    { href: "/admin/one-lingo/sends", label: "Sends" },
  ],
  "/admin/one-news": [
    { href: "/admin/one-news", label: "Overview" },
    { href: "/admin/one-news/subscribers", label: "Subscribers" },
    { href: "/admin/one-news/issues", label: "Issues" },
    { href: "/admin/one-news/sources", label: "Sources" },
    { href: "/admin/one-news/sends", label: "Sends" },
  ],
  "/admin/one-film": [
    { href: "/admin/one-film", label: "Overview" },
    { href: "/admin/one-film/subscribers", label: "Subscribers" },
    { href: "/admin/one-film/issues", label: "Issues" },
    { href: "/admin/one-film/catalog", label: "Catalog" },
    { href: "/admin/one-film/sends", label: "Sends" },
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
                      <span className="flex items-center justify-between gap-2">
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-eyebrow text-fog">
                            {item.badge}
                          </span>
                        )}
                      </span>
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
