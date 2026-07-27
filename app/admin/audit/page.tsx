import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { loadAuditLogs, summarizeAuditMetadata } from "@/lib/admin/audit";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { fmtDateTime } from "@/lib/admin/format";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/audit — append-only admin mutation log from AdminAuditLog. */
export default async function AuditPage(
  props: {
    searchParams: Promise<{ action?: string; targetType?: string; q?: string; date?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = guardAdminPage("/admin/audit", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [logs, targetTypes] = await Promise.all([
    loadAuditLogs(searchParams, 150),
    prisma.adminAuditLog.findMany({
      distinct: ["targetType"],
      select: { targetType: true },
      orderBy: { targetType: "asc" },
    }),
  ]);

  return (
    <AdminShell
      title="Audit log"
      subtitle="From AdminAuditLog · mutating admin actions only"
    >
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 text-[12.5px] font-sans">
        <FilterField label="Search">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="actor, action, target"
            className="w-52 rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
          />
        </FilterField>
        <FilterField label="Date">
          <input
            type="date"
            name="date"
            defaultValue={searchParams.date ?? ""}
            className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
          />
        </FilterField>
        <FilterField label="Action">
          <input
            type="text"
            name="action"
            defaultValue={searchParams.action ?? ""}
            placeholder="user.pause"
            className="w-40 rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
          />
        </FilterField>
        <FilterField label="Target">
          <select
            name="targetType"
            defaultValue={searchParams.targetType ?? ""}
            className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
          >
            <option value="">Any</option>
            {targetTypes.map(({ targetType }) => (
              <option key={targetType} value={targetType}>{targetType}</option>
            ))}
          </select>
        </FilterField>
        <button
          type="submit"
          className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-admin-ink hover:bg-admin-sink"
        >
          Apply
        </button>
        <Link href="/admin/audit" className="px-2 py-1.5 text-admin-muted hover:text-admin-ink">
          Reset
        </Link>
      </form>

      <AdminCard
        title="Events"
        subtitle={`${logs.length} most recent matching rows · metadata summarized, secrets redacted`}
      >
        <AdminTable
          head={["Created", "Action", "Target", "Target ID", "Actor", "Metadata"]}
          empty="No audit events match these filters."
          rows={logs.map((log) => [
            <span key="d" className="text-admin-body">{fmtDateTime(log.createdAt)}</span>,
            <StatusBadge key="a" value={log.action} tone="neutral" />,
            <span key="t" className="text-admin-body">{log.targetType}</span>,
            <MonoShort key="id" value={log.targetId} />,
            <span key="actor" className="font-mono text-[11.5px] text-admin-body">{log.actor}</span>,
            <span key="m" className="text-[11.5px] text-admin-body">
              {summarizeAuditMetadata(log.metadata)}
            </span>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}</span>
      {children}
    </label>
  );
}
