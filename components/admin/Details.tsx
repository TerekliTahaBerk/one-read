import type { ReactNode } from "react";

/**
 * A calm, collapsed-by-default disclosure for raw technical fields (IDs, model
 * names, env keys, run history). Native <details>/<summary> — no client JS —
 * so it works inside server components. The whole panel keeps its plain-English
 * surface while debugging data stays one click away.
 */
export function Details({
  summary = "Technical details",
  children,
  className,
}: {
  summary?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`group rounded-2xl border border-admin-line bg-admin-surface/60 ${className ?? ""}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-sans text-[12.5px] text-admin-muted hover:text-admin-body">
        <span className="inline-block transition-transform group-open:rotate-90">▸</span>
        {summary}
      </summary>
      <div className="border-t border-admin-line px-4 py-3">{children}</div>
    </details>
  );
}
