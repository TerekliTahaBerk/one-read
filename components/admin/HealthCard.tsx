import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Plain-English health presentation blocks shared across the admin overview and
 * per-product pages. A traffic-light dot + a human headline + a single "next
 * action" sentence — no enums, no model names, no cron strings.
 */

export type Health = "ok" | "attention" | "problem";

const DOT_CLASS: Record<Health, string> = {
  ok: "bg-emerald-500",
  attention: "bg-amber-500",
  problem: "bg-dawn",
};

const TEXT_CLASS: Record<Health, string> = {
  ok: "text-emerald-700",
  attention: "text-amber-700",
  problem: "text-dawn",
};

export function StatusDot({ health }: { health: Health }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT_CLASS[health]}`}
      aria-hidden
    />
  );
}

/**
 * Big status line for the top of an overview page: dot + headline, an optional
 * supporting sentence, and an optional "Next: …" line.
 */
export function HealthHeadline({
  health,
  headline,
  detail,
  next,
}: {
  health: Health;
  headline: ReactNode;
  detail?: ReactNode;
  next?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1.5 ${TEXT_CLASS[health]}`}>
        <StatusDot health={health} />
      </span>
      <div className="min-w-0">
        <div className={`font-serif text-[20px] leading-tight ${TEXT_CLASS[health]}`}>
          {headline}
        </div>
        {detail != null && (
          <p className="mt-1 font-sans text-[13px] text-admin-body">{detail}</p>
        )}
        {next != null && (
          <p className="mt-1 font-sans text-[13px] text-admin-ink">
            <span className="text-admin-muted">Next: </span>
            {next}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * One product's at-a-glance card for the home dashboard. Dot + name, a headline
 * status, a handful of plain facts, and a "Manage →" link.
 */
export function ProductHealthCard({
  name,
  href,
  health,
  headline,
  facts,
}: {
  name: string;
  href: string;
  health: Health;
  headline: ReactNode;
  facts: readonly (readonly [ReactNode, ReactNode])[];
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-admin-line bg-admin-surface p-4 shadow-admin">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusDot health={health} />
          <span className="font-serif text-[16px] text-admin-ink">{name}</span>
        </div>
        <Link
          href={href}
          className="font-sans text-[12.5px] text-admin-ink underline underline-offset-2 hover:text-admin-body"
        >
          Manage →
        </Link>
      </div>
      <div className={`mb-3 font-sans text-[13px] ${TEXT_CLASS[health]}`}>{headline}</div>
      <FactList rows={facts} />
    </div>
  );
}

/** Plain label: value rows — human facts, no monospace, no model names. */
export function FactList({
  rows,
}: {
  rows: readonly (readonly [ReactNode, ReactNode])[];
}) {
  return (
    <dl className="mt-auto space-y-1.5">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-3">
          <dt className="font-sans text-[12.5px] text-admin-muted">{k}</dt>
          <dd className="text-right font-sans text-[12.5px] text-admin-ink/90">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
