import Link from "next/link";
import { adminFeatureFlags, guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OneArticleOverviewActions } from "@/components/admin/OneArticleOverviewActions";
import { getOverviewMetrics, loadOneArticleSubs, toSubRow } from "@/lib/admin/queries";
import { oneArticleTabs } from "@/lib/admin/nav";
import { SEND_TIMEZONE, fmtDateTime, isoDate, todayUtc } from "@/lib/admin/format";
import {
  geminiConfigured,
  getOneArticleIssueReadiness,
  nextOneArticleSend,
  oneArticleCronEnabled,
  oneArticleDryRunForced,
} from "@/lib/admin/one-article-ops";
import { getResendStatus } from "@/lib/resend";
import { isApprovalRequired } from "@/lib/admin/issues-config";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/one-article — operations overview for the live OneArticle product. */
export default async function OneArticleOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-article", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const today = todayUtc();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextSend = nextOneArticleSend();
  const [
    m,
    todayReadiness,
    tomorrowReadiness,
    subs,
    lastRun,
    lastSuccessRun,
    lastFailedRun,
    lastProviderSend,
  ] = await Promise.all([
    getOverviewMetrics(),
    getOneArticleIssueReadiness({ date: today }),
    getOneArticleIssueReadiness({ date: tomorrow }),
    loadOneArticleSubs(),
    prisma.operationalRun.findFirst({
      where: { productKey: "one-article" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.operationalRun.findFirst({
      where: { productKey: "one-article", status: "SUCCESS" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.operationalRun.findFirst({
      where: { productKey: "one-article", status: "FAILED" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.dailySend.findFirst({
      where: { emailMessageId: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { emailMessageId: true, sentAt: true },
    }),
  ]);
  const flags = adminFeatureFlags();
  const resend = getResendStatus();
  const subRows = subs.map((s) => toSubRow(s));
  const pendingCheckout = subRows.filter((s) => s.status === "PENDING_CHECKOUT").length;
  const pendingPreferences = subRows.filter((s) => s.status === "PENDING_PREFERENCES").length;
  const ineligible = subRows.filter((s) => !s.eligible).length;
  const topSkipReasons = Object.entries(
    subRows.reduce<Record<string, number>>((acc, row) => {
      if (!row.eligible) acc[row.reason] = (acc[row.reason] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <AdminShell title="OneArticle" subtitle="Daily editorial operations">
      <AdminTabs tabs={oneArticleTabs()} active="overview" />

      <AdminCard title="Operational status" bodyClassName="p-4">
        <DefList
          rows={[
            ["Product", "OneArticle"],
            ["Public visibility", "Visible"],
            ["Billing provider", "Polar"],
            ["AI provider", geminiConfigured() ? "Gemini configured" : "Gemini missing"],
            ["Email provider", resend.hasApiKey ? "Resend configured" : "Resend missing"],
            ["Cron enabled", oneArticleCronEnabled() ? "Enabled" : "Disabled"],
            ["Approval required", isApprovalRequired() ? "Yes" : "No"],
            ["Admin send actions", flags.sendActionsEnabled ? "Enabled" : "Disabled"],
            ["Dry-run mode", oneArticleDryRunForced() ? "On" : "Off"],
            ["Timezone", SEND_TIMEZONE],
            ["Send time", "07:00 Europe/Istanbul"],
            ["Next scheduled send", `${nextSend.localLabel} · ${fmtDateTime(nextSend.utc)}`],
            ["Last cron/admin run", lastRun ? `${fmtDateTime(lastRun.startedAt)} · ${lastRun.status}` : "Not tracked yet"],
            ["Last successful run", lastSuccessRun ? fmtDateTime(lastSuccessRun.startedAt) : "Not tracked yet"],
            ["Last cron error", lastFailedRun?.error ? `${fmtDateTime(lastFailedRun.startedAt)} · ${lastFailedRun.error}` : "None tracked"],
          ]}
        />
      </AdminCard>

      <AdminCard title="Operational warnings" bodyClassName="p-4">
        {[...todayReadiness.blockers, ...todayReadiness.warnings].length > 0 ? (
          <ul className="space-y-1 text-[12.5px] text-ash font-sans">
            {[...todayReadiness.blockers, ...todayReadiness.warnings].map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-emerald-700 font-sans">No blockers for today.</p>
        )}
      </AdminCard>

      <AdminCard title={`Today's issue · ${todayReadiness.issueDate}`} subtitle={todayReadiness.status} bodyClassName="p-4">
        <IssueReadinessMetrics readiness={todayReadiness} />
      </AdminCard>

      <AdminCard title={`Tomorrow's issue · ${tomorrowReadiness.issueDate}`} subtitle={tomorrowReadiness.status} bodyClassName="p-4">
        <IssueReadinessMetrics readiness={tomorrowReadiness} />
      </AdminCard>

      <AdminCard title="Subscriber readiness" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Total subscriptions" value={subs.length} />
          <MetricCard label="Active / trial / override" value={(m.access.ACTIVE_PAID ?? 0) + (m.access.TRIALING ?? 0) + (m.access.ADMIN_OVERRIDE ?? 0)} tone="good" />
          <MetricCard label="Eligible" value={m.eligibleCount} tone="good" />
          <MetricCard label="Ineligible" value={ineligible} tone={ineligible > 0 ? "warn" : "default"} />
          <MetricCard label="Pending checkout" value={pendingCheckout} />
          <MetricCard label="Pending preferences" value={pendingPreferences} />
          <MetricCard label="Email unsubscribed" value={m.users.paused} />
          <MetricCard label="Suppressed" value={m.users.suppressed} tone={m.users.suppressed > 0 ? "warn" : "default"} />
        </MetricGrid>
        {topSkipReasons.length > 0 && (
          <p className="text-[12.5px] text-ash font-sans">
            Top ineligible reasons: {topSkipReasons.map(([reason, count]) => `${reason} (${count})`).join(" · ")}
          </p>
        )}
      </AdminCard>

      <AdminCard title={`Send summary · ${m.ops.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Prepared issues" value={m.ops.picksToday} />
          <MetricCard label="Approved / scheduled" value={m.ops.approvedToday} />
          <MetricCard label="Sent" value={m.ops.sentToday} tone="good" />
          <MetricCard label="Skipped" value={m.ops.skippedToday} />
          <MetricCard label="Failed" value={m.ops.failedToday} tone={m.ops.failedToday > 0 ? "warn" : "default"} />
        </MetricGrid>
        <p className="text-[12.5px] text-ash font-sans">
          Last successful send: {fmtDateTime(m.ops.lastSendAt)}. Last provider
          message id: {lastProviderSend?.emailMessageId ?? "Not tracked yet"}.
        </p>
      </AdminCard>

      <AdminCard title="Quick actions" subtitle="Prepare-only actions never send subscriber email" bodyClassName="p-4">
        <OneArticleOverviewActions />
      </AdminCard>

      <div className="flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-article/issues" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">
          Prepared issues →
        </Link>
        <Link href="/admin/one-article/subscribers" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">
          Subscribers →
        </Link>
        <Link href="/admin/one-article/sends" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">
          Send logs →
        </Link>
      </div>
    </AdminShell>
  );
}

function IssueReadinessMetrics({
  readiness,
}: {
  readiness: Awaited<ReturnType<typeof getOneArticleIssueReadiness>>;
}) {
  return (
    <>
      <MetricGrid>
        <MetricCard label="Issue exists" value={readiness.issueExists ? readiness.issueCount : "Missing"} tone={readiness.issueExists ? "good" : "warn"} />
        <MetricCard label="Generated" value={readiness.generatedContentExists ? "Yes" : "No"} tone={readiness.generatedContentExists ? "good" : "warn"} />
        <MetricCard label="Approved" value={readiness.approved ? "Yes" : "No"} tone={readiness.approved ? "good" : "warn"} />
        <MetricCard label="Scheduled" value={readiness.scheduled ? "Yes" : "No"} />
        <MetricCard label="Eligible" value={readiness.eligibleCount} tone={readiness.eligibleCount > 0 ? "good" : "warn"} />
        <MetricCard label="Already sent" value={readiness.alreadySentCount} />
        <MetricCard label="Failed" value={readiness.failedCount} tone={readiness.failedCount > 0 ? "warn" : "default"} />
      </MetricGrid>
      <div className="space-y-2 text-[12.5px] text-ash font-sans">
        <p>Subject: {readiness.subject ?? "Unknown"}</p>
        <p>Preview: {readiness.previewText ?? "Unknown"}</p>
        <p>Scheduled for: {fmtDateTime(readiness.scheduledFor)}</p>
        <p>Next action: {readiness.nextAction}</p>
        {readiness.pickId && (
          <Link href={`/admin/one-article/issues/${readiness.pickId}`} className="text-ink underline underline-offset-2">
            Open issue
          </Link>
        )}
      </div>
      {readiness.blockers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {readiness.blockers.map((b) => <StatusBadge key={b} value={b} tone="bad" />)}
        </div>
      )}
    </>
  );
}
