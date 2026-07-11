import Link from "next/link";
import { adminFeatureFlags, guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { HealthHeadline, FactList, type Health } from "@/components/admin/HealthCard";
import { Details } from "@/components/admin/Details";
import { OneArticleOverviewActions } from "@/components/admin/OneArticleOverviewActions";
import { ApproveAllButton } from "@/components/admin/ApproveAllButton";
import { getOverviewMetrics, loadOneArticleSubs, toSubRow } from "@/lib/admin/queries";
import { oneArticleTabs } from "@/lib/admin/nav";
import { SEND_TIMEZONE, fmtDateTime, fmtWhen, fmtAgo, isoDate, todayUtc } from "@/lib/admin/format";
import {
  getOneArticleAiStatus,
  getOneArticleIssueReadiness,
  nextOneArticleSend,
} from "@/lib/admin/one-article-ops";
import { getControls } from "@/lib/admin/settings-store";
import { getResendStatus } from "@/lib/resend";
import { prisma } from "@/lib/prisma";
import { ProductRunActions } from "@/components/admin/ProductRunActions";

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
  const controls = (await getControls()).oneArticle;
  const resend = getResendStatus();
  const aiStatus = getOneArticleAiStatus();
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
  const critical = [
    ...(aiStatus.blocker ? [`${aiStatus.blocker}.`] : []),
    ...todayReadiness.blockers,
    ...(!resend.hasApiKey ? ["Resend is not configured."] : []),
  ];
  const warnings = [
    ...todayReadiness.warnings,
    ...(m.eligibleCount > 0 && m.eligibleCount <= 1 ? [`Only ${m.eligibleCount} subscriber is eligible.`] : []),
    ...(pendingCheckout > 0 ? [`${pendingCheckout} subscribers are pending checkout.`] : []),
  ];
  const info = [
    controls.cronEnabled
      ? `Cron enabled. Next expected run: ${nextSend.localLabel} · ${fmtDateTime(nextSend.utc)}.`
      : "Cron disabled.",
    controls.dryRun ? "Dry-run mode on." : "Dry-run mode off.",
  ];
  const currentState = todayReadiness.alreadySentCount > 0
    ? "Sent today"
    : critical.length > 0
      ? todayReadiness.status === "Needs content"
        ? "Needs content"
        : "Blocked"
      : todayReadiness.status;

  const health: Health =
    todayReadiness.alreadySentCount > 0
      ? "ok"
      : critical.length > 0
        ? "problem"
        : currentState === "Ready for scheduled send"
          ? "ok"
          : "attention";
  const aiOk = aiStatus.blocker === null;

  return (
    <AdminShell title="OneArticle" subtitle="Daily article, delivered every morning">
      <AdminTabs tabs={oneArticleTabs()} active="overview" />

      <AdminCard bodyClassName="p-4">
        <HealthHeadline
          health={health}
          headline={currentState}
          detail={critical[0] ?? todayReadiness.nextAction}
          next={`${nextSend.localLabel}`}
        />
      </AdminCard>

      <AdminCard title="At a glance" bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FactList
            rows={[
              ["Today's issue", todayReadiness.issueExists ? todayReadiness.status : "Nothing yet"],
              ["Tomorrow's issue", tomorrowReadiness.issueExists ? tomorrowReadiness.status : "Nothing yet"],
              ["Automatic sending", controls.cronEnabled ? "On" : "Off"],
              ["Next send", nextSend.localLabel],
            ]}
          />
          <FactList
            rows={[
              ["AI brain", aiOk ? "Working" : "Needs setup"],
              ["Email delivery", resend.hasApiKey ? "Connected" : "Needs setup"],
              ["Subscribers ready", `${m.eligibleCount}`],
              ["Last delivered", fmtAgo(m.ops.lastSendAt)],
            ]}
          />
        </div>
      </AdminCard>

      <AdminCard title="Run now" subtitle="Generate or send today's issue on demand" bodyClassName="p-4">
        <ProductRunActions
          endpoint="/api/admin/one-article/action"
          productName="OneArticle"
          dryRunDisabledReason={!aiOk ? "AI generation is not configured" : null}
          liveRunDisabledReason={
            !flags.sendActionsEnabled ? "manual sends are disabled"
              : !resend.hasApiKey ? "email delivery is not configured"
                : m.eligibleCount === 0 ? "there are no eligible subscribers"
                  : controls.requireApproval && m.ops.approvedToday === 0 ? "no issue is approved for today"
                    : null
          }
        />
      </AdminCard>

      {critical.length + warnings.length > 0 && (
        <AdminCard title="Needs a look" bodyClassName="p-4">
          <div className="space-y-4 text-[12.5px] font-sans">
            <WarningGroup title="Fix these" tone="text-dawn" items={dedupe(critical)} />
            <WarningGroup title="Worth checking" tone="text-amber-700" items={dedupe(warnings)} />
          </div>
        </AdminCard>
      )}

      <AdminCard title={`Today's delivery · ${m.ops.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Prepared" value={m.ops.picksToday} />
          <MetricCard label="Approved / scheduled" value={m.ops.approvedToday} />
          <MetricCard label="Delivered" value={m.ops.sentToday} tone="good" />
          <MetricCard label="Skipped" value={m.ops.skippedToday} />
          <MetricCard label="Failed" value={m.ops.failedToday} tone={m.ops.failedToday > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>

      <AdminCard title="Approvals" subtitle="Clear today's review queue in one click" bodyClassName="p-4">
        <p className="mb-3 text-[12.5px] text-admin-body font-sans">
          Approves every issue that&apos;s ready for today. Anything still being
          prepared stays in review.
        </p>
        <ApproveAllButton endpoint="/api/admin/issues/action" label="Approve all ready today" />
      </AdminCard>

      <AdminCard title="Quick actions" subtitle="These prepare content — they never email subscribers" bodyClassName="p-4">
        <OneArticleOverviewActions />
      </AdminCard>

      <div className="mb-8 flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-article/issues" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">
          Prepared issues →
        </Link>
        <Link href="/admin/one-article/subscribers" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">
          Subscribers →
        </Link>
        <Link href="/admin/one-article/sends" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">
          Send logs →
        </Link>
      </div>

      <Details summary="Technical details — system status, issue readiness, run history">
        <div className="space-y-6">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">System status</div>
            <DefList
              rows={[
                ["Product", "OneArticle"],
                ["Public visibility", "Visible"],
                ["Billing provider", "Polar"],
                ["AI provider", aiStatus.statusLabel],
                ["AI_PROVIDER", aiStatus.selectedProviderLabel],
                ["Gemini API key", aiStatus.geminiKeyConfigured ? "Configured" : "Missing"],
                ["Active AI model", aiStatus.activeModel],
                ["Article scorer", aiStatus.scorerEnabled ? "Enabled" : "Blocked"],
                ["Summary generator", aiStatus.summaryGeneratorEnabled ? "Enabled" : "Blocked"],
                ["Email provider", resend.hasApiKey ? "Resend configured" : "Resend missing"],
                ["Cron enabled", controls.cronEnabled ? "Enabled" : "Disabled"],
                ["Approval required", controls.requireApproval ? "Yes" : "No"],
                ["Admin send actions", flags.sendActionsEnabled ? "Enabled" : "Disabled"],
                ["Dry-run mode", controls.dryRun ? "On" : "Off"],
                ["Timezone", SEND_TIMEZONE],
                ["Send time", "07:00 Europe/Istanbul"],
                ["Next scheduled send", `${nextSend.localLabel} · ${fmtDateTime(nextSend.utc)}`],
                ["Last cron/admin run", lastRun ? `${fmtDateTime(lastRun.startedAt)} · ${lastRun.status}` : "Not tracked yet"],
                ["Last successful run", lastSuccessRun ? fmtDateTime(lastSuccessRun.startedAt) : "Not tracked yet"],
                ["Last cron error", lastFailedRun?.error ? `${fmtDateTime(lastFailedRun.startedAt)} · ${lastFailedRun.error}` : "None tracked"],
                ["Last provider message id", lastProviderSend?.emailMessageId ?? "Not tracked yet"],
              ]}
            />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">Today&apos;s issue · {todayReadiness.issueDate}</div>
            <IssueReadinessMetrics readiness={todayReadiness} />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">Tomorrow&apos;s issue · {tomorrowReadiness.issueDate}</div>
            <IssueReadinessMetrics readiness={tomorrowReadiness} />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">Subscriber breakdown</div>
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
              <p className="text-[12.5px] text-admin-body font-sans">
                Top ineligible reasons: {topSkipReasons.map(([reason, count]) => `${reason} (${count})`).join(" · ")}
              </p>
            )}
          </div>

          {info.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">Info</div>
              <ul className="space-y-1 text-[12.5px] text-admin-body font-sans">
                {dedupe(info).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Details>
    </AdminShell>
  );
}

function WarningGroup({ title, tone, items }: { title: string; tone: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-eyebrow text-admin-muted">{title}</div>
      <ul className={`space-y-1 ${tone}`}>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
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
      <div className="space-y-2 text-[12.5px] text-admin-body font-sans">
        <p>Subject: {readiness.subject ?? "Unknown"}</p>
        <p>Preview: {readiness.previewText ?? "Unknown"}</p>
        <p>Scheduled for: {fmtDateTime(readiness.scheduledFor)}</p>
        <p>Next action: {readiness.nextAction}</p>
        {readiness.pickId && (
          <Link href={`/admin/one-article/issues/${readiness.pickId}`} className="text-admin-ink underline underline-offset-2">
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
