"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PRODUCTS } from "@/lib/admin/products";

/**
 * Left navigation for the admin. Highlights the active section and expands the
 * matching sub-nav. Intentionally unlinked from any public UI. Neutral white
 * palette via the `admin-*` tokens; the active row is marked with the section's
 * accent (`admin-accent`), which the shell recolours per product.
 */
type NavItem = {
  href: string;
  label: string;
  matchPrefix?: string;
  badge?: string;
  icon: keyof typeof ICONS;
  /** Placeholder entry — rendered disabled, never navigates (future phase). */
  disabled?: boolean;
};

/**
 * Derive a product's nav badge from the canonical catalog so it never goes
 * stale: "Waitlist" for pre-launch, "Hidden" for a live product not shown on
 * the public site, and no badge for a fully live + public product.
 */
function productBadge(key: string): string | undefined {
  const p = PRODUCTS.find((x) => x.key === key);
  if (!p) return undefined;
  if (p.status === "waitlist") return "Waitlist";
  if (!p.publicVisible) return "Hidden";
  return undefined;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Main",
    items: [
      { href: "/admin", label: "Overview", icon: "grid" },
      { href: "/admin/users", label: "Users", matchPrefix: "/admin/users", icon: "users" },
      { href: "/admin/products", label: "Products", icon: "box" },
    ],
  },
  {
    label: "Products",
    items: [
      {
        href: "/admin/one-article",
        label: "OneArticle",
        matchPrefix: "/admin/one-article",
        icon: "doc",
      },
      {
        href: "/admin/one-lingo",
        label: "OneLingo",
        matchPrefix: "/admin/one-lingo",
        badge: productBadge("one-lingo"),
        icon: "chat",
      },
      {
        href: "/admin/one-film",
        label: "OneFilm",
        matchPrefix: "/admin/one-film",
        badge: productBadge("one-film"),
        icon: "film",
      },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        href: "#",
        label: "Analytics",
        badge: "Soon",
        icon: "chart",
        disabled: true,
      },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "gear" },
      { href: "/admin/audit", label: "Audit log", matchPrefix: "/admin/audit", icon: "list" },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

const SUB_NAV: Record<string, { href: string; label: string }[]> = {
  "/admin/one-article": [
    { href: "/admin/one-article", label: "Overview" },
    { href: "/admin/one-article/new", label: "New article" },
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
  "/admin/one-film": [
    { href: "/admin/one-film", label: "Overview" },
    { href: "/admin/one-film/subscribers", label: "Subscribers" },
    { href: "/admin/one-film/issues", label: "Issues" },
    { href: "/admin/one-film/catalog", label: "Catalog" },
    { href: "/admin/one-film/sends", label: "Sends" },
  ],
};

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/admin";

  const isActive = (item: NavItem): boolean => {
    if (item.disabled) return false;
    if (item.matchPrefix) return pathname.startsWith(item.matchPrefix);
    return pathname === item.href;
  };

  const activeTop = NAV.find(isActive);
  const sub = activeTop?.matchPrefix ? SUB_NAV[activeTop.matchPrefix] : undefined;

  return (
    <nav className="font-sans text-[13px]">
      <ul className="space-y-5">
        {NAV_GROUPS.map((group) => (
          <li key={group.label}>
            <div className="px-3 pb-1.5 text-[10px] uppercase tracking-eyebrow text-admin-muted">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item);
                const Icon = ICONS[item.icon];

                if (item.disabled) {
                  return (
                    <li key={item.label}>
                      <span
                        aria-disabled
                        title="Coming in a later iteration"
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-admin-muted/60"
                      >
                        <span className="text-admin-muted/50">{Icon}</span>
                        <span className="flex-1">{item.label}</span>
                        {item.badge && <NavBadge>{item.badge}</NavBadge>}
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                        active
                          ? "bg-admin-accent-tint font-medium text-admin-ink"
                          : "text-admin-body hover:bg-admin-sink hover:text-admin-ink"
                      }`}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-admin-accent" />
                      )}
                      <span className={active ? "text-admin-accent" : "text-admin-muted"}>
                        {Icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && <NavBadge>{item.badge}</NavBadge>}
                    </Link>

                    {active && sub && (
                      <ul className="mb-1 ml-[26px] mt-0.5 space-y-0.5 border-l border-admin-line pl-3">
                        {sub.map((s) => {
                          const subActive = pathname === s.href;
                          return (
                            <li key={s.href}>
                              <Link
                                href={s.href}
                                onClick={onNavigate}
                                className={`block rounded-md px-2 py-1 text-[12.5px] transition-colors ${
                                  subActive
                                    ? "font-medium text-admin-accent-strong"
                                    : "text-admin-muted hover:text-admin-ink"
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

      <div className="mt-6 border-t border-admin-line pt-3">
        {/*
          Logout is a POST form, never a <Link>. A GET/prefetchable logout link
          would be hit by Next.js prefetch and clear the session in the
          background right after login. method="post" with full navigation lets
          the route handler 303-redirect to /admin/login.
        */}
        <form action="/admin/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-admin-body transition-colors hover:bg-admin-sink hover:text-admin-ink"
          >
            <span className="text-admin-muted">{ICONS.logout}</span>
            Logout
          </button>
        </form>
      </div>
    </nav>
  );
}

function NavBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-admin-line-strong px-1.5 py-0.5 text-[9px] uppercase tracking-eyebrow text-admin-muted">
      {children}
    </span>
  );
}

/* ---- icons (inline 18px line set) ------------------------------------- */
const s = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const ICONS = {
  grid: (
    <svg {...s}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  users: (
    <svg {...s}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2a3 3 0 010 5.6M17 14.2c2.2.5 3.5 2.4 3.5 4.8" />
    </svg>
  ),
  box: (
    <svg {...s}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </svg>
  ),
  doc: (
    <svg {...s}>
      <path d="M6 3.5h8l4 4v13H6z" />
      <path d="M14 3.5v4h4M8.5 12h7M8.5 15.5h7" />
    </svg>
  ),
  chat: (
    <svg {...s}>
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
    </svg>
  ),
  film: (
    <svg {...s}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M8 4.5v15M16 4.5v15M3.5 9.5h4.5M16 9.5h4.5M3.5 14.5h4.5M16 14.5h4.5" />
    </svg>
  ),
  chart: (
    <svg {...s}>
      <path d="M4 4v16h16" />
      <path d="M8 15v2M12 11v6M16 7v10" />
    </svg>
  ),
  gear: (
    <svg {...s}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M4.2 7l2.2 1.3M17.6 15.7l2.2 1.3M4.2 17l2.2-1.3M17.6 8.3l2.2-1.3" />
    </svg>
  ),
  list: (
    <svg {...s}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  ),
  logout: (
    <svg {...s}>
      <path d="M15 4.5H6a1.5 1.5 0 00-1.5 1.5v12A1.5 1.5 0 006 19.5h9" />
      <path d="M12 12h8M17 9l3 3-3 3" />
    </svg>
  ),
} as const;
