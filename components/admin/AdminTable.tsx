import type { ReactNode } from "react";

/**
 * Dense, calm, editorial table. Header row in eyebrow caps; hairline row
 * dividers; subtle hover. Generic over whatever cells the caller passes.
 */
export function AdminTable({
  head,
  rows,
  empty,
}: {
  head: readonly ReactNode[];
  rows: readonly (readonly ReactNode[])[];
  /** Shown in place of the body when there are no rows. */
  empty?: ReactNode;
}) {
  if (rows.length === 0 && empty != null) {
    return (
      <div className="px-5 py-10 text-center text-[13px] text-fog font-sans">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-eyebrow text-fog">
            {head.map((h, i) => (
              <th
                key={i}
                className="px-4 py-3 font-sans font-normal whitespace-nowrap border-b border-line"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-line/60 last:border-b-0 hover:bg-cream/40 transition-colors"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 align-top text-ink/90 font-sans"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Truncated monospace identifier with full value on hover. */
export function MonoShort({ value }: { value: string | null | undefined }) {
  const v = value ?? "—";
  const display = v.length > 14 ? `${v.slice(0, 10)}…` : v;
  return (
    <span
      title={v === "—" ? undefined : v}
      className="font-mono text-[10.5px] text-fog"
    >
      {display}
    </span>
  );
}
