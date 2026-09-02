import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneNewsTabs } from "@/lib/admin/one-news-nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsIssuesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-news", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const page = Math.max(1, Number(typeof searchParams.page === "string" ? searchParams.page : "1") || 1);
  const pageSize = 50;

  const [issues, total] = await Promise.all([
    prisma.oneNewsIssue.findMany({
      orderBy: [{ scheduledFor: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.oneNewsIssue.count(),
  ]);
  const issueIds = issues.map((issue) => issue.id);
  const [logicalCounts, providerCounts] = issueIds.length ? await Promise.all([
    prisma.oneNewsDelivery.groupBy({
      by: ["issueId", "status"], where: { issueId: { in: issueIds } }, _count: { _all: true },
    }),
    prisma.oneNewsDelivery.groupBy({
      by: ["issueId", "providerStatus"], where: { issueId: { in: issueIds } }, _count: { _all: true },
    }),
  ]) : [[], []];

  return (
    <AdminShell
      title="OneNews"
      subtitle="One story worth understanding — selected, sourced and edited by a human"
      actions={
        <Link
          href="/admin/one-news/new"
          className="rounded-lg bg-admin-accent px-3 py-2 text-[12.5px] text-white"
        >
          + New edition
        </Link>
      }
    >
      <AdminTabs tabs={oneNewsTabs()} active="issues" />
      <AdminCard
        title="Editions"
        subtitle="Accepted and mailbox-delivered states are tracked separately."
      >
        <AdminTable
          head={["Headline", "Language", "Status", "Accepted", "Delivered", "Failed", "Updated"]}
          rows={issues.map((issue) => {
            const logical = (value: string) => logicalCounts.find(
              (row) => row.issueId === issue.id && row.status === value,
            )?._count._all ?? 0;
            const provider = (value: string) => providerCounts.find(
              (row) => row.issueId === issue.id && row.providerStatus === value,
            )?._count._all ?? 0;
            return [
            <Link
              key={`${issue.id}-headline`}
              href={`/admin/one-news/issues/${issue.id}`}
              className="text-admin-ink underline"
            >
              {issue.headline || "Untitled draft"}
            </Link>,
            issue.readingLanguage,
            <StatusBadge key={`${issue.id}-status`} value={issue.status} />,
            String(logical("SENT")),
            String(provider("DELIVERED")),
            String(logical("FAILED") + logical("RECONCILIATION_REQUIRED")),
            fmtDateTime(issue.updatedAt),
          ];})}
          empty="No OneNews editions yet."
        />
        <div className="mt-4 flex items-center justify-between text-sm">
          <span>Page {page} · {total} editions</span>
          <div className="flex gap-3">
            {page > 1 ? <Link href={`/admin/one-news?page=${page - 1}`}>Previous</Link> : null}
            {page * pageSize < total ? <Link href={`/admin/one-news?page=${page + 1}`}>Next</Link> : null}
          </div>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
