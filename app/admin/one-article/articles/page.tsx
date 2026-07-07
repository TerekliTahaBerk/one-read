import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ArticleActions } from "@/components/admin/ArticleActions";
import { ArticleBulkActions } from "@/components/admin/ArticleBulkActions";
import { oneArticleTabs } from "@/lib/admin/nav";
import { topicBySlug } from "@/lib/topics";
import { fmtDate, todayUtc } from "@/lib/admin/format";
import { getOneArticleAiStatus } from "@/lib/admin/one-article-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/one-article/articles — the ingested + manually-added article pool. */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const guard = guardAdminPage("/admin/one-article/articles", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const where = searchParams.status ? { scoringStatus: searchParams.status } : {};
  const aiStatus = getOneArticleAiStatus();
  const [articles, usedArticleIds, articleStatusCounts, rejectedArticles, lastArticle, lastScoredArticle] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { ingestedAt: "desc" },
      take: 100,
      include: { picks: { select: { id: true } } },
    }),
    prisma.topicDailyPick.findMany({ select: { articleId: true } }),
    prisma.article.groupBy({ by: ["scoringStatus"], _count: { _all: true } }),
    prisma.article.findMany({
      where: { scoringStatus: "REJECTED" },
      select: { rejectionReason: true },
      take: 500,
    }),
    prisma.article.findFirst({ orderBy: { ingestedAt: "desc" }, select: { ingestedAt: true } }),
    prisma.article.findFirst({
      where: { scoringStatus: { in: ["SCORED", "REJECTED"] } },
      orderBy: { ingestedAt: "desc" },
      select: { ingestedAt: true },
    }),
  ]);
  const usedIds = new Set(usedArticleIds.map((p) => p.articleId));
  const statusCounts = Object.fromEntries(articleStatusCounts.map((r) => [r.scoringStatus, r._count._all]));
  const totalArticleCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const httpRejected = rejectedArticles.filter((a) => /HTTP \d+/.test(a.rejectionReason ?? "")).length;
  const fetchBlocked = rejectedArticles.filter((a) => (a.rejectionReason ?? "").includes("HTTP 403")).length;
  const extractionFailed = rejectedArticles.filter((a) =>
    /(cleaned text too short|readability|paywall|non-html|response too large|HTTP \d+)/i.test(a.rejectionReason ?? ""),
  ).length;
  const scoringRejected = rejectedArticles.length - extractionFailed;
  const defaultIssueDate = todayUtc().toISOString().slice(0, 10);
  const nextAction = aiStatus.scorerEnabled
    ? (statusCounts.PENDING ?? 0) > 0
      ? "Rescore pending articles"
      : (statusCounts.SCORED ?? 0) > 0
        ? "Create an issue from a scored article"
        : "Add a manual article with body text"
    : aiStatus.blocker ?? "Configure AI provider";

  const isDemoOrManual = (a: { sourceName: string; tags: string[] }) =>
    a.sourceName === "OneRead Demo" || a.tags.includes("demo") || a.tags.includes("manual");

  return (
    <AdminShell title="Articles" subtitle={`${articles.length} most recent`}>
      <AdminTabs tabs={oneArticleTabs()} active="articles" />

      <AdminCard title="Article pipeline status" subtitle={aiStatus.statusLabel} bodyClassName="p-4">
        <div className="grid grid-cols-2 gap-3 text-[12.5px] font-sans md:grid-cols-4">
          <Metric label="Total articles" value={totalArticleCount} />
          <Metric label="Pending scoring" value={statusCounts.PENDING ?? 0} tone={(statusCounts.PENDING ?? 0) > 0 ? "text-amber-700" : ""} />
          <Metric label="Ready / scored" value={statusCounts.SCORED ?? 0} tone="text-emerald-700" />
          <Metric label="Rejected" value={statusCounts.REJECTED ?? 0} tone={(statusCounts.REJECTED ?? 0) > 0 ? "text-dawn" : ""} />
          <Metric label="HTTP fetch rejected" value={httpRejected} tone={httpRejected > 0 ? "text-dawn" : ""} />
          <Metric label="HTTP 403 blocked" value={fetchBlocked} tone={fetchBlocked > 0 ? "text-dawn" : ""} />
          <Metric label="Extraction failed" value={extractionFailed} />
          <Metric label="Scoring rejected" value={scoringRejected} />
        </div>
        <div className="mt-4 space-y-1 text-[12.5px] text-admin-body font-sans">
          <p>Scorer: {aiStatus.scorerEnabled ? `${aiStatus.statusLabel} · ${aiStatus.activeModel}` : `${aiStatus.statusLabel} — scoring is disabled`}</p>
          <p>Last ingest: {lastArticle ? fmtDate(lastArticle.ingestedAt) : "No articles ingested yet"}. Last scoring activity: {lastScoredArticle ? fmtDate(lastScoredArticle.ingestedAt) : "No scored/rejected article yet"}.</p>
          <p>Next action: {nextAction}</p>
          {aiStatus.blocker && <p className="text-dawn">{aiStatus.blocker}.</p>}
        </div>
      </AdminCard>

      <div className="mb-6 flex flex-wrap items-center gap-3 text-[12.5px] font-sans">
        <form method="get" className="flex items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Scoring status</span>
            <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink">
              <option value="">Any</option>
              {["PENDING", "SCORED", "REJECTED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-admin-ink hover:bg-admin-sink">
            Apply
          </button>
        </form>
        <Link
          href="/admin/manual-article"
          className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-admin-ink hover:bg-admin-sink"
        >
          + Add article manually
        </Link>
        <ArticleBulkActions />
      </div>

      <AdminCard>
        <AdminTable
          head={["Title", "Source", "Topic", "Lang", "Status", "Quality", "Extraction", "Used", "Ingested", "Reason / next", "Actions"]}
          empty="No articles ingested yet."
          rows={articles.map((a) => [
            <span key="t" className="block min-w-[180px]">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-admin-ink hover:underline">
                {a.title}
              </a>
              {isDemoOrManual(a) && (
                <span className="ml-2 text-[10px] uppercase tracking-eyebrow text-dawn align-middle">
                  {a.sourceName === "OneRead Demo" ? "demo" : "manual"}
                </span>
              )}
            </span>,
            <span key="s" className="text-admin-body">{a.sourceName}</span>,
            topicBySlug(a.topic)?.label ?? a.topic,
            <span key="l" className="text-admin-body">{a.sourceLanguage}</span>,
            <StatusBadge key="st" value={a.scoringStatus} />,
            a.qualityScore.toFixed(2),
            <span key="ex" className="text-[11.5px] text-admin-body">
              {extractionStatus(a.rejectionReason, a.extractionConfidence)}
            </span>,
            usedIds.has(a.id) ? <StatusBadge key="u" value="used" tone="good" /> : <span key="u" className="text-admin-muted">—</span>,
            <span key="i" className="text-admin-body">{fmtDate(a.ingestedAt)}</span>,
            <span key="r" className="block max-w-[260px] text-[11.5px] text-admin-body">
              {articleReason(a.rejectionReason, a.reasonForSelection, aiStatus)}
              {(a.rawExcerpt || a.cleanedText) && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-admin-muted">Excerpt/text</summary>
                  <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap rounded-md border border-admin-line bg-admin-surface/70 p-2 font-mono text-[10.5px] text-admin-ink/80">
                    {(a.cleanedText ?? a.rawExcerpt ?? "").slice(0, 1200)}
                  </p>
                </details>
              )}
            </span>,
            <ArticleActions
              key="actions"
              articleId={a.id}
              defaultDate={defaultIssueDate}
              canCreateIssue={a.scoringStatus !== "PENDING" && Boolean(a.cleanedText || a.rawExcerpt)}
            />,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}

function Metric({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-admin-line bg-admin-surface/70 p-3">
      <div className="text-[10px] uppercase tracking-eyebrow text-admin-muted">{label}</div>
      <div className={`mt-1 font-serif text-[22px] ${tone || "text-admin-ink"}`}>{value}</div>
    </div>
  );
}

function extractionStatus(reason: string | null, confidence: number | null): string {
  if (reason?.includes("HTTP 403")) return "Source blocked fetch (HTTP 403)";
  if (reason?.startsWith("HTTP ")) return reason;
  if (confidence == null) return "Not extracted yet";
  if (confidence < 0.45) return `Low confidence (${confidence.toFixed(2)})`;
  return `OK (${confidence.toFixed(2)})`;
}

function articleReason(
  rejectionReason: string | null,
  reasonForSelection: string | null,
  aiStatus: ReturnType<typeof getOneArticleAiStatus>,
): string {
  if (rejectionReason?.includes("HTTP 403")) {
    return "Source blocked fetch (HTTP 403). Add manually or choose another source.";
  }
  if (!aiStatus.scorerEnabled) return `${aiStatus.blocker ?? "AI provider is not configured"} — scoring is disabled.`;
  return rejectionReason ?? reasonForSelection ?? "Ready for scoring or issue selection.";
}
