import type { ReactNode } from "react";
import { AdminNav } from "./AdminNav";

/**
 * Page chrome for every admin screen: wordmark, left nav (token-preserving),
 * and a titled content column. Desktop-first but degrades to a stacked layout
 * on small screens.
 */
export function AdminShell({
  token,
  title,
  subtitle,
  actions,
  children,
}: {
  token: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="min-h-svh w-full bg-cream/30">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8">
        <div className="mb-8">
          <span className="font-serif italic uppercase tracking-wordmark text-[12px] text-ink/85">
            OneRead · admin
          </span>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-48 lg:shrink-0">
            <div className="lg:sticky lg:top-8">
              <AdminNav token={token} />
            </div>
          </aside>
          <div className="min-w-0 flex-1">
            <AdminHeader title={title} subtitle={subtitle} actions={actions} />
            {children}
          </div>
        </div>
      </div>
    </main>
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
        <h1 className="font-serif text-2xl tracking-tight text-ink">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-[13px] text-ash font-sans">{subtitle}</p>
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
    <main className="min-h-svh w-full px-5 sm:px-8 py-16">
      <div className="mx-auto max-w-prose text-center">
        <span className="font-serif italic uppercase tracking-wordmark text-[12px] text-ink/85">
          OneRead · admin
        </span>
        <p className="mt-6 text-ash text-sm font-sans">
          Set <code className="font-mono">ADMIN_TOKEN</code> in your environment
          to enable the admin panel.
        </p>
      </div>
    </main>
  );
}
