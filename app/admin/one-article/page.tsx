import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneArticleTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { SUMMARY_LANGUAGES } from "@/lib/options";
import { countEligibleEditorialRecipients } from "@/lib/one-article/editorial";
import { getControls } from "@/lib/admin/settings-store";
import { getResendStatus } from "@/lib/resend";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneArticleEditorialOverview({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-article", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const [next, recent, statusCounts, controls, languageCounts] = await Promise.all([
    prisma.oneArticleIssue.findFirst({
      where: { status: "SCHEDULED", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
    }),
    prisma.oneArticleIssue.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.oneArticleIssue.groupBy({ by: ["status"], _count: { _all: true } }),
    getControls(),
    Promise.all(SUMMARY_LANGUAGES.map(async (language) => [language, await countEligibleEditorialRecipients(language)] as const)),
  ]);
  const resend = getResendStatus();
  const count = (status: string) => statusCounts.find((row) => row.status === status)?._count._all ?? 0;
  const healthy =
    controls.oneArticle.cronEnabled &&
    !controls.oneArticle.dryRun &&
    resend.hasApiKey;
  return (
    <AdminShell title="OneArticle" subtitle="Manual editorial publishing in five reading languages">
      <AdminTabs tabs={oneArticleTabs()} active="overview" />
      <AdminCard bodyClassName="p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2"><StatusBadge value={healthy ? "READY" : "NEEDS ATTENTION"} tone={healthy ? "good" : "bad"} /><span className="text-[12px] text-admin-muted">Editorial dispatcher</span></div>
            <h2 className="mt-3 font-serif text-[24px] text-admin-ink">{next ? `Next: ${next.headline}` : "No edition scheduled"}</h2>
            <p className="mt-1 text-[13px] text-admin-body">{next ? `${next.readingLanguage} · ${fmtDateTime(next.scheduledFor)}` : "Create an edition, review it, then choose its delivery time."}</p>
          </div>
          <Link href="/admin/one-article/new" className="inline-flex h-11 items-center justify-center rounded-lg bg-admin-accent px-5 text-[13px] font-medium text-white">Write new edition</Link>
        </div>
      </AdminCard>
      <AdminCard title="Publishing queue" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Drafts" value={count("DRAFT")} />
          <MetricCard label="Ready" value={count("READY")} />
          <MetricCard label="Scheduled" value={count("SCHEDULED")} tone="good" />
          <MetricCard label="Sent" value={count("SENT")} tone="good" />
          <MetricCard label="Partial failures" value={count("PARTIALLY_FAILED")} tone={count("PARTIALLY_FAILED") ? "warn" : "default"} />
          <MetricCard label="Failed" value={count("FAILED")} tone={count("FAILED") ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>
      <AdminCard title="Audience by reading language" subtitle="Eligible right now" bodyClassName="p-4">
        <MetricGrid>
          {languageCounts.map(([language, recipients]) => <MetricCard key={language} label={language} value={recipients} tone={recipients > 0 ? "good" : "default"} />)}
        </MetricGrid>
      </AdminCard>
      <AdminCard title="Recent editions" bodyClassName="p-0">
        <div className="divide-y divide-admin-line">
          {recent.length === 0 ? <p className="p-5 text-[13px] text-admin-muted">No editions yet.</p> : recent.map((issue) => (
            <Link key={issue.id} href={`/admin/one-article/issues/${issue.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-admin-sink">
              <div><div className="text-[13.5px] font-medium text-admin-ink">{issue.headline}</div><div className="mt-1 text-[11.5px] text-admin-muted">{issue.readingLanguage} · updated {fmtDateTime(issue.updatedAt)}</div></div>
              <StatusBadge value={issue.status} />
            </Link>
          ))}
        </div>
      </AdminCard>
      <div className="mb-8 flex flex-wrap gap-3 text-[12.5px] text-admin-body">
        <span>Cron: {controls.oneArticle.cronEnabled ? "on" : "off"}</span>
        <span>·</span>
        <span>Delivery mode: {controls.oneArticle.dryRun ? "preview only" : "live"}</span>
        <span>·</span>
        <span>Email delivery: {resend.hasApiKey ? "connected" : "not configured"}</span>
        <span>·</span>
        <span>Mode: manual editorial, no RSS/AI generation</span>
      </div>
    </AdminShell>
  );
}
