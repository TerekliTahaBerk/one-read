import type { ReactNode } from "react";

/** A titled, bordered container. The workhorse layout block of the admin. */
export function AdminCard({
  title,
  subtitle,
  actions,
  children,
  bodyClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="mb-8">
      {(title || subtitle || actions) && (
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            {title && (
              <h2 className="font-serif text-[18px] text-admin-ink">{title}</h2>
            )}
            {subtitle && (
              <span className="font-sans text-[11.5px] text-admin-muted">
                {subtitle}
              </span>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border border-admin-line bg-admin-surface shadow-admin">
        {bodyClassName ? (
          <div className={bodyClassName}>{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Reference-style stat card: eyebrow label, large serif figure, optional
 *  supporting hint. Used across the dashboard metric grids. */
export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "default" | "warn" | "good";
}) {
  const valueClass =
    tone === "warn"
      ? "text-dawn"
      : tone === "good"
        ? "text-emerald-700"
        : "text-admin-ink";
  return (
    <div className="rounded-2xl border border-admin-line bg-admin-surface px-4 py-3.5 shadow-admin transition-shadow hover:shadow-admin-md">
      <div className="font-sans text-[11px] uppercase tracking-eyebrow text-admin-muted">
        {label}
      </div>
      <div
        className={`mt-1.5 font-serif text-[clamp(18px,2vw,28px)] leading-tight ${valueClass}`}
      >
        {value}
      </div>
      {hint != null && (
        <div className="mt-1.5 font-sans text-[11.5px] text-admin-body/80">
          {hint}
        </div>
      )}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {children}
    </div>
  );
}

/** Calm empty state for tables/lists. */
export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center font-sans text-[13px] text-admin-muted">
      {children}
    </div>
  );
}

/** Inline key/value definition list for detail pages. */
export function DefList({
  rows,
}: {
  rows: readonly (readonly [ReactNode, ReactNode])[];
}) {
  return (
    <dl className="divide-y divide-admin-line/70">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex gap-4 px-4 py-2.5">
          <dt className="w-44 shrink-0 font-sans text-[12px] text-admin-muted">
            {k}
          </dt>
          <dd className="min-w-0 break-words font-sans text-[12.5px] text-admin-ink/90">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
