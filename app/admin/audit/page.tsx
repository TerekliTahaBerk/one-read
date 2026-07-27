import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { loadAuditLogs, summarizeAuditMetadata } from "@/lib/admin/audit";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { fmtDateTime } from "@/lib/admin/format";
import { prisma } from "@/lib/prisma";
import {
  AdminFilterBar,
  AdminFilterField,
  adminControlClass,
  adminFilterButtonClass,
  adminResetClass,
} from "@/components/admin/AdminFilters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/audit — append-only admin mutation log from AdminAuditLog. */
export default async function AuditPage(
  props: {
    searchParams: Promise<{ action?: string; targetType?: string; q?: string; date?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/audit", searchParams);
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
      <AdminFilterBar method="get">
        <AdminFilterField label="Search">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="actor, action, target"
            className={`${adminControlClass} w-56`}
          />
        </AdminFilterField>
        <AdminFilterField label="Date">
          <input
            type="date"
            name="date"
            defaultValue={searchParams.date ?? ""}
            className={adminControlClass}
          />
        </AdminFilterField>
        <AdminFilterField label="Action">
          <input
            type="text"
            name="action"
            defaultValue={searchParams.action ?? ""}
            placeholder="user.pause"
            className={`${adminControlClass} w-44`}
          />
        </AdminFilterField>
        <AdminFilterField label="Target">
          <select
            name="targetType"
            defaultValue={searchParams.targetType ?? ""}
            className={adminControlClass}
          >
            <option value="">Any</option>
            {targetTypes.map(({ targetType }) => (
              <option key={targetType} value={targetType}>{targetType}</option>
            ))}
          </select>
        </AdminFilterField>
        <button
          type="submit"
          className={adminFilterButtonClass}
        >
          Apply filters
        </button>
        <Link href="/admin/audit" className={adminResetClass}>
          Reset
        </Link>
      </AdminFilterBar>

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
