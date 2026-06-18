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
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <div className="flex items-baseline gap-3">
            {title && (
              <h2 className="font-serif text-[18px] text-ink">{title}</h2>
            )}
            {subtitle && (
              <span className="text-[11.5px] text-fog font-sans">
                {subtitle}
              </span>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="border border-line rounded-xl bg-paper/60 overflow-hidden">
        {bodyClassName ? (
          <div className={bodyClassName}>{children}</div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Small labelled number, for the dashboard metric grids. */
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
        : "text-ink";
  return (
    <div className="border border-line rounded-xl bg-paper/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-eyebrow text-fog font-sans">
        {label}
      </div>
      <div className={`mt-1 font-serif text-[26px] leading-none ${valueClass}`}>
        {value}
      </div>
      {hint != null && (
        <div className="mt-1.5 text-[11.5px] text-ash font-sans">{hint}</div>
      )}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
      {children}
    </div>
  );
}

/** Calm empty state for tables/lists. */
export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center text-[13px] text-fog font-sans">
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
    <dl className="divide-y divide-line/70">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex gap-4 px-4 py-2.5">
          <dt className="w-44 shrink-0 text-[12px] text-fog font-sans">{k}</dt>
          <dd className="text-[12.5px] text-ink/90 font-sans break-words min-w-0">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}
