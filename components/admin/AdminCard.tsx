import type { ReactNode } from "react";

/** A titled, bordered container. The workhorse layout block of the admin. */
export function AdminCard({
  title,
  subtitle,
  actions,
  children,
  bodyClassName,
  containerClassName,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  containerClassName?: string;
}) {
  return (
    <section className="mb-6 sm:mb-7">
      {(title || subtitle || actions) && (
        <div className="mb-3.5 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex min-w-0 flex-col items-start gap-1">
            {title && (
              <h2 className="font-serif text-[20px] leading-tight tracking-[-0.015em] text-admin-ink sm:text-[22px]">{title}</h2>
            )}
            {subtitle && (
              <span className="max-w-3xl font-sans text-[12px] leading-5 text-admin-muted">
                {subtitle}
              </span>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div
        className={`rounded-[18px] border border-admin-line bg-admin-surface shadow-admin ${
          containerClassName ?? "overflow-hidden"
        }`}
      >
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
    <div className="min-w-0 rounded-[18px] border border-admin-line bg-admin-surface px-4 py-4 shadow-admin transition duration-200 hover:-translate-y-0.5 hover:shadow-admin-md sm:px-5">
      <div className="font-sans text-[11px] uppercase tracking-eyebrow text-admin-muted">
        {label}
      </div>
      <div
        className={`mt-2 min-w-0 break-words font-serif text-[clamp(22px,2.4vw,32px)] leading-[1.05] tracking-[-0.025em] ${valueClass}`}
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
    <div className="admin-metric-grid mb-6 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 [&:last-child]:mb-0">
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
        <div key={i} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(9rem,0.42fr)_minmax(0,1fr)] sm:items-start sm:gap-5 sm:px-5">
          <dt className="font-sans text-[12px] text-admin-muted">
            {k}
          </dt>
          <dd className="min-w-0 break-words font-sans text-[12.5px] leading-5 text-admin-ink/90 sm:text-right">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
