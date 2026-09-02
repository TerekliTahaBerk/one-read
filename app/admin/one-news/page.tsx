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

  const issues = await prisma.oneNewsIssue.findMany({
    orderBy: [{ scheduledFor: "desc" }, { updatedAt: "desc" }],
    take: 200,
    include: { _count: { select: { sources: true, corrections: true } } },
  });

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
        subtitle="OneNews is not connected to delivery yet. Nothing here can be sent."
      >
        <AdminTable
          head={["Headline", "Language", "Status", "Sources", "Corrections", "Updated"]}
          rows={issues.map((issue) => [
            <Link
              key={`${issue.id}-headline`}
              href={`/admin/one-news/issues/${issue.id}`}
              className="text-admin-ink underline"
            >
              {issue.headline || "Untitled draft"}
            </Link>,
            issue.readingLanguage,
            <StatusBadge key={`${issue.id}-status`} value={issue.status} />,
            String(issue._count.sources),
            String(issue._count.corrections),
            fmtDateTime(issue.updatedAt),
          ])}
          empty="No OneNews editions yet."
        />
      </AdminCard>
    </AdminShell>
  );
}
