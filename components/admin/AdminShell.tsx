"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AdminNav } from "./AdminNav";

/**
 * Page chrome for every admin screen: a white, persistent left sidebar
 * (OneRead wordmark + grouped nav + logout), a sticky top bar with breadcrumb,
 * search and today's date, and a titled content column. Desktop shows the
 * sidebar inline; on small screens it collapses into a slide-in drawer.
 *
 * The base palette is neutral white (matching the public site chrome); the
 * single accent is a CSS variable that the shell recolours per product section
 * (OneArticle blue, OneLingo purple, OneFilm mauve, OneRead ink) from the
 * canonical values in lib/product-themes.ts. Accent-driven `admin-*` tokens
 * pick up the variable automatically, so nothing else needs to know the theme.
 */

/** accent / hover-strong / tint (active-selected wash) per section. */
const ADMIN_THEMES = {
  read: { accent: "#111111", strong: "#000000", tint: "#F2F2F2" },
  article: { accent: "#3F6FA8", strong: "#345C8C", tint: "#DDEEFF" },
  lingo: { accent: "#6F5AA8", strong: "#5B4890", tint: "#EEE7FB" },
  film: { accent: "#7B5E8E", strong: "#664B77", tint: "#F1E8F5" },
} as const;

function adminThemeVars(pathname: string): CSSProperties {
  const t = pathname.startsWith("/admin/one-article")
    ? ADMIN_THEMES.article
    : pathname.startsWith("/admin/one-lingo")
      ? ADMIN_THEMES.lingo
      : pathname.startsWith("/admin/one-film")
        ? ADMIN_THEMES.film
        : ADMIN_THEMES.read;
  return {
    "--admin-accent": t.accent,
    "--admin-accent-strong": t.strong,
    "--admin-accent-tint": t.tint,
  } as CSSProperties;
}

const CRUMB_LABELS: Record<string, string> = {
  admin: "Admin",
  "one-article": "OneArticle",
  "one-lingo": "OneLingo",
  "one-film": "OneFilm",
  users: "Users",
  products: "Products",
  settings: "Settings",
  audit: "Audit log",
  "manual-article": "Manual article",
  new: "New edition",
  subscribers: "Subscribers",
  issues: "Editions",
  articles: "Articles",
  sends: "Deliveries",
  lessons: "Lessons",
  catalog: "Catalog",
};

function labelFor(segment: string): string {
  return (
    CRUMB_LABELS[segment] ??
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function AdminShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname() ?? "/admin";

  // Breadcrumb: "Admin" root, then intermediate sections, then the page title
  // as the current (leaf) crumb. Using the title prop for the leaf keeps id /
  // detail routes readable instead of showing a raw cuid.
  const segments = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  const middle = segments.slice(1, -1).map((seg, i) => ({
    label: labelFor(seg),
    href: "/" + segments.slice(0, i + 2).join("/"),
  }));

  return (
    <div
      style={adminThemeVars(pathname)}
      className="min-h-svh bg-admin-bg text-admin-body font-sans"
    >
      <div className="flex min-h-svh">
        {/* Desktop sidebar */}
        <aside className="hidden w-[248px] shrink-0 flex-col border-r border-admin-line bg-admin-sink/50 lg:flex">
          <SidebarContent />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-admin-ink/30 backdrop-blur-[1px]"
            />
            <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-admin-line bg-admin-surface shadow-admin-md">
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-admin-line bg-admin-bg/85 px-5 backdrop-blur sm:px-8">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setDrawerOpen(true)}
              className="-ml-1 grid h-9 w-9 place-items-center rounded-lg text-admin-body hover:bg-admin-sink lg:hidden"
            >
              <MenuIcon />
            </button>

            <nav
              aria-label="Breadcrumb"
              className="flex min-w-0 items-center gap-1.5 text-[13px]"
            >
              <Link
                href="/admin"
                className="shrink-0 text-admin-muted transition-colors hover:text-admin-ink"
              >
                Admin
              </Link>
              {middle.map((c) => (
                <span key={c.href} className="flex min-w-0 items-center gap-1.5">
                  <ChevronIcon />
                  <Link
                    href={c.href}
                    className="truncate text-admin-muted transition-colors hover:text-admin-ink"
                  >
                    {c.label}
                  </Link>
                </span>
              ))}
              <ChevronIcon />
              <span className="truncate font-medium text-admin-ink">
                {title}
              </span>
            </nav>

            <div className="ml-auto flex items-center gap-3">
              <DateChip />
            </div>
          </header>

          <main className="flex-1 px-5 py-8 sm:px-8">
            <AdminHeader title={title} subtitle={subtitle} actions={actions} />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

/** Brand block + navigation + logout — shared by the desktop rail and the
 *  mobile drawer. */
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link
        href="/admin"
        onClick={onNavigate}
        aria-label="OneRead admin — overview"
        className="flex items-center gap-2.5 border-b border-admin-line px-5 py-[18px]"
      >
        <Image
          src="/oneread-logo.png"
          alt="OneRead"
          width={1057}
          height={250}
          priority
          className="h-[24px] w-auto select-none"
        />
        <span className="rounded-full border border-admin-line-strong px-2 py-0.5 text-[9.5px] uppercase tracking-eyebrow text-admin-muted">
          Admin
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <AdminNav onNavigate={onNavigate} />
      </div>
    </>
  );
}


function DateChip() {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <span className="hidden items-center gap-2 rounded-full border border-admin-line bg-admin-surface px-3.5 py-[7px] text-[12.5px] text-admin-body sm:flex">
      <CalendarIcon />
      {today}
    </span>
  );
}

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <h1 className="font-serif text-[27px] font-medium leading-none tracking-[-0.02em] text-admin-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 font-sans text-[13px] text-admin-body/85">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Rendered by admin pages when ADMIN_TOKEN is not configured. Never reveals
 * data. Mirrors the original app/admin/page.tsx notice.
 */
export function AdminNotConfigured() {
  return (
    <main className="min-h-svh w-full bg-admin-bg px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-prose text-center">
        <span className="font-serif italic uppercase tracking-wordmark text-[12px] text-admin-ink/85">
          OneRead · admin
        </span>
        <p className="mt-6 font-sans text-sm text-admin-body">
          Set <code className="font-mono">ADMIN_TOKEN</code> in your environment
          plus admin login credentials to enable the admin panel.
        </p>
      </div>
    </main>
  );
}

/* ---- icons (inline, no external deps) --------------------------------- */

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 text-admin-muted/70"
    >
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M20 20l-3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="text-admin-accent"
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3.5 9.5h17M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
