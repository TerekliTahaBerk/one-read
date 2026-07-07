import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { NewArticleAuthor } from "@/components/admin/NewArticleAuthor";
import { IssueStatusButton } from "@/components/admin/IssueStatusButton";
import { oneArticleTabs } from "@/lib/admin/nav";
import { ALL_TOPIC_SLUGS, topicBySlug } from "@/lib/topics";
import { getOneArticleAiStatus } from "@/lib/admin/one-article-ops";
import { fmtDate, todayUtc } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/one-article/new — author a OneArticle issue with the AI or by hand,
 * saved as a DRAFT or READY issue (no source article). Lists recently authored
 * issues with their source and lifecycle state.
 */
export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-article/new", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const aiStatus = getOneArticleAiStatus();
  const defaultDate = todayUtc().toISOString().slice(0, 10);

  // Authored issues have no source article (manual + AI-drafted).
  const authored = await prisma.topicDailyPick.findMany({
    where: { articleId: null },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      summaries: { select: { status: true, generator: true }, orderBy: { createdAt: "desc" }, take: 1 },
      sends: { select: { status: true } },
    },
  });

  return (
    <AdminShell title="New article" subtitle="Author a OneArticle issue with AI or by hand">
      <AdminTabs tabs={oneArticleTabs()} active="new" />

      <AdminCard
        title="Write a new issue"
        subtitle="Saved as a draft or ready issue — no source article, nothing sent here"
      >
        <div className="p-4">
          <NewArticleAuthor
            topicSlugs={[...ALL_TOPIC_SLUGS]}
            defaultDate={defaultDate}
            ai={{
              statusLabel: aiStatus.statusLabel,
              blocker: aiStatus.blocker,
              productionReady: aiStatus.productionReady,
              activeModel: aiStatus.activeModel,
            }}
          />
        </div>
      </AdminCard>

      <AdminCard title="Recently authored" subtitle="Manual and AI issues you have written">
        <AdminTable
          head={["Date", "Topic", "Title", "Source", "Status", ""]}
          empty="No hand-authored issues yet."
          rows={authored.map((p) => {
            const sent = p.sends.some((s) => s.status === "SENT");
            const editorial = (p.status === "DRAFT" ? "DRAFT" : "READY") as "DRAFT" | "READY";
            return [
              <span key="d" className="whitespace-nowrap text-admin-body">{fmtDate(p.date)}</span>,
              <span key="tp" className="text-admin-body">{topicBySlug(p.topic)?.label ?? p.topic}</span>,
              <a key="t" href={`/admin/one-article/issues/${p.id}`} className="block min-w-[180px] text-admin-ink hover:underline">
                {p.articleTitle}
              </a>,
              <span key="src" className="text-admin-body">{sourceLabel(p.summaries[0]?.generator)}</span>,
              <StatusBadge key="st" value={sent ? "SENT" : p.status} />,
              <span key="a" className="flex justify-end gap-2">
                {!sent && <IssueStatusButton pickId={p.id} status={editorial} />}
                <a
                  href={`/admin/one-article/issues/${p.id}`}
                  className="rounded-full border border-admin-line-strong bg-admin-surface px-3 py-1 text-[11.5px] text-admin-ink hover:bg-admin-sink"
                >
                  Edit
                </a>
              </span>,
            ];
          })}
        />
      </AdminCard>
    </AdminShell>
  );
}

function sourceLabel(generator: string | null | undefined): string {
  if (!generator || generator === "manual") return "Manual";
  if (generator.startsWith("heuristic")) return "AI · heuristic";
  return "AI";
}
