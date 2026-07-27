import type { ReactNode } from "react";

/**
 * Dense, calm, editorial table. Header row in eyebrow caps on a warm tint;
 * hairline row dividers; subtle amber-free hover. Generic over whatever cells
 * the caller passes.
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
      <div className="px-5 py-10 text-center font-sans text-[13px] text-admin-muted">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto overscroll-x-contain [scrollbar-color:#DADADA_transparent]">
      <table className="min-w-[760px] w-full text-left text-[13px]">
        <thead>
          <tr className="bg-admin-sink/70 text-[10px] uppercase tracking-[0.16em] text-admin-muted">
            {head.map((h, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-admin-line px-4 py-3.5 font-sans font-medium"
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
              className="border-b border-admin-line/70 transition-colors last:border-b-0 hover:bg-admin-sink/55"
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3.5 align-top font-sans leading-5 text-admin-ink/90"
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
      className="font-mono text-[10.5px] text-admin-muted"
    >
      {display}
    </span>
  );
}
