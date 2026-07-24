import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneArticleTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";
import { SUMMARY_LANGUAGES } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditorialIssuesPage({
  searchParams,
}: {
  searchParams: { status?: string; language?: string };
}) {
  const guard = guardAdminPage("/admin/one-article/issues", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const where: Prisma.OneArticleIssueWhereInput = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.language) where.readingLanguage = searchParams.language;
  const issues = await prisma.oneArticleIssue.findMany({
    where,
    orderBy: [{ scheduledFor: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  const deliveryCounts =
    issues.length > 0
      ? await prisma.oneArticleDelivery.groupBy({
          by: ["issueId", "status"],
          where: { issueId: { in: issues.map((issue) => issue.id) } },
          _count: { _all: true },
        })
      : [];
  const deliveryCount = (issueId: string, status: string) =>
    deliveryCounts.find(
      (row) => row.issueId === issueId && row.status === status,
    )?._count._all ?? 0;
  return (
    <AdminShell
      title="Editions"
      subtitle="Manual, language-specific OneArticle publishing"
      actions={<Link href="/admin/one-article/new" className="rounded-lg bg-admin-accent px-3 py-2 text-[12.5px] text-white">+ New edition</Link>}
    >
      <AdminTabs tabs={oneArticleTabs()} active="issues" />
      <form method="get" className="mb-5 flex flex-wrap items-end gap-3 text-[12.5px]">
        <label><span className="mb-1 block text-[10px] uppercase tracking-eyebrow text-admin-muted">Status</span><select name="status" defaultValue={searchParams.status ?? ""} className={filterClass}><option value="">All</option>{["DRAFT", "READY", "SCHEDULED", "SENDING", "SENT", "PARTIALLY_FAILED", "FAILED", "CANCELED"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] uppercase tracking-eyebrow text-admin-muted">Language</span><select name="language" defaultValue={searchParams.language ?? ""} className={filterClass}><option value="">All</option>{SUMMARY_LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select></label>
        <button className={filterClass}>Apply</button>
        <Link href="/admin/one-article/issues" className="px-2 py-2 text-admin-muted">Reset</Link>
      </form>
      <AdminCard>
        <AdminTable
          head={["Headline", "Language", "Status", "Scheduled", "Delivered", "Failed", "Updated", ""]}
          empty="No editorial editions match these filters."
          rows={issues.map((issue) => [
            <span key="h" className="block min-w-[220px] font-medium text-admin-ink">{issue.headline || "Untitled edition"}</span>,
            issue.readingLanguage,
            <StatusBadge key="s" value={issue.status} />,
            <span key="sc" className="whitespace-nowrap text-admin-body">{fmtDateTime(issue.scheduledFor)}</span>,
            deliveryCount(issue.id, "SENT"),
            <span key="f" className={deliveryCount(issue.id, "FAILED") > 0 ? "text-rose-700" : ""}>{deliveryCount(issue.id, "FAILED")}</span>,
            <span key="u" className="whitespace-nowrap text-admin-body">{fmtDateTime(issue.updatedAt)}</span>,
            <Link key="v" href={`/admin/one-article/issues/${issue.id}`} className="text-admin-ink underline underline-offset-2">Open</Link>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}

const filterClass = "rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-admin-ink";
