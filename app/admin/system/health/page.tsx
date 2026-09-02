import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { HealthHeadline } from "@/components/admin/HealthCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { getSystemHealth } from "@/lib/admin/system-health";

export const dynamic = "force-dynamic";

/**
 * /admin/system/health — a summary of first-party signals only.
 *
 * Vercel, Sentry, and Better Stack remain the systems of record for
 * infrastructure. This page deliberately reproduces none of them; it answers
 * the narrower question of whether OneRead's own data looks healthy.
 */
export default async function SystemHealthPage() {
  const guard = await guardAdminPage("/admin/system/health");
  if (!guard.ok) return <AdminNotConfigured />;

  const health = await getSystemHealth();

  return (
    <AdminShell title="System health" subtitle="Database-derived operational signals">
      <AdminCard bodyClassName="p-4">
        <HealthHeadline
          health={health.healthy ? "ok" : "attention"}
          headline={health.headline}
          detail="Infrastructure detail stays in Vercel, Sentry, and Better Stack."
        />
      </AdminCard>

      <AdminCard title="Operational signals">
        <DefList
          rows={[
            [
              "Latest run",
              health.latestRun ? (
                <span key="run">
                  <StatusBadge value={health.latestRun.status} /> ·{" "}
                  {fmtDateTime(health.latestRun.finishedAt ?? health.latestRun.startedAt)}
                </span>
              ) : (
                "No run recorded"
              ),
            ],
            [
              "Latest successful dispatch",
              health.lastSuccessfulDispatchAt
                ? fmtDateTime(health.lastSuccessfulDispatchAt)
                : "None recorded",
            ],
            [
              "Latest failed or partial run",
              health.latestFailedRunAt ? fmtDateTime(health.latestFailedRunAt) : "None",
            ],
            ["Stale sending deliveries", String(health.staleSending)],
            ["Overdue scheduled editions", String(health.overdueIssues)],
            ["Ambiguous deliveries awaiting reconciliation", String(health.ambiguous)],
            ["Unprocessed billing events", String(health.unprocessedBillingEvents)],
          ]}
        />
      </AdminCard>

      <AdminCard title="Configuration">
        <DefList
          rows={[
            ["Environment", health.environment],
            ["Email delivery (Resend)", health.resendConfigured ? "Configured" : "Not configured"],
            ["Error monitoring (Sentry)", health.sentryConfigured ? "Configured" : "Not configured"],
            [
              "Uptime heartbeat (Better Stack)",
              health.heartbeatConfigured ? "Configured" : "Not configured",
            ],
          ]}
        />
      </AdminCard>
    </AdminShell>
  );
}
