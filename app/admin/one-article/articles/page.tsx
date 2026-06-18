import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneArticleTabs } from "@/lib/admin/nav";
import { topicBySlug } from "@/lib/topics";
import { fmtDate } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/one-article/articles — the ingested + manually-added article pool. */
export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: { token?: string; status?: string };
}) {
  const guard = guardAdminPage(searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const { token } = guard;
  const tokenQ = `token=${encodeURIComponent(token)}`;

  const where = searchParams.status ? { scoringStatus: searchParams.status } : {};
  const [articles, usedArticleIds] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { ingestedAt: "desc" },
      take: 100,
      include: { picks: { select: { id: true } } },
    }),
    prisma.topicDailyPick.findMany({ select: { articleId: true } }),
  ]);
  const usedIds = new Set(usedArticleIds.map((p) => p.articleId));

  const isDemoOrManual = (a: { sourceName: string; tags: string[] }) =>
    a.sourceName === "OneRead Demo" || a.tags.includes("demo") || a.tags.includes("manual");

  return (
    <AdminShell token={token} title="Articles" subtitle={`${articles.length} most recent`}>
      <AdminTabs tabs={oneArticleTabs(token)} active="articles" />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-[12.5px] font-sans">
        <form method="get" className="flex items-end gap-3">
          <input type="hidden" name="token" value={token} />
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-eyebrow text-fog">Scoring status</span>
            <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-ink">
              <option value="">Any</option>
              {["PENDING", "SCORED", "REJECTED"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-ink hover:bg-cream">
            Apply
          </button>
        </form>
        <Link
          href={`/admin/manual-article?${tokenQ}`}
          className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-ink hover:bg-cream"
        >
          + Add article manually
        </Link>
      </div>

      <AdminCard>
        <AdminTable
          head={["Title", "Source", "Topic", "Lang", "Status", "Quality", "Used", "Ingested", "Reason"]}
          empty="No articles ingested yet."
          rows={articles.map((a) => [
            <span key="t">
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-ink hover:underline">
                {a.title}
              </a>
              {isDemoOrManual(a) && (
                <span className="ml-2 text-[10px] uppercase tracking-eyebrow text-dawn align-middle">
                  {a.sourceName === "OneRead Demo" ? "demo" : "manual"}
                </span>
              )}
            </span>,
            <span key="s" className="text-ash">{a.sourceName}</span>,
            topicBySlug(a.topic)?.label ?? a.topic,
            <span key="l" className="text-ash">{a.sourceLanguage}</span>,
            <StatusBadge key="st" value={a.scoringStatus} />,
            a.qualityScore.toFixed(2),
            usedIds.has(a.id) ? <StatusBadge key="u" value="used" tone="good" /> : <span key="u" className="text-fog">—</span>,
            <span key="i" className="text-ash">{fmtDate(a.ingestedAt)}</span>,
            <span key="r" className="text-[11.5px] text-ash">{a.rejectionReason ?? a.reasonForSelection ?? "—"}</span>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
