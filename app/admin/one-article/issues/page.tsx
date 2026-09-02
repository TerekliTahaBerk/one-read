import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  AdminFilterBar,
  AdminFilterField,
  adminControlClass,
  adminFilterButtonClass,
  adminResetClass,
} from "@/components/admin/AdminFilters";
import { oneArticleTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";
import { SUMMARY_LANGUAGES } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditorialIssuesPage(
  props: {
    searchParams: Promise<{ status?: string; language?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-article/issues", searchParams);
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
      <AdminFilterBar method="get">
        <AdminFilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ""} className={adminControlClass}><option value="">All statuses</option>{["DRAFT", "READY", "SCHEDULED", "SENDING", "SENT", "PARTIALLY_FAILED", "FAILED", "CANCELED"].map((status) => <option key={status}>{status}</option>)}</select>
        </AdminFilterField>
        <AdminFilterField label="Language">
          <select name="language" defaultValue={searchParams.language ?? ""} className={adminControlClass}><option value="">All languages</option>{SUMMARY_LANGUAGES.map((language) => <option key={language}>{language}</option>)}</select>
        </AdminFilterField>
        <button className={adminFilterButtonClass}>Apply filters</button>
        <Link href="/admin/one-article/issues" className={adminResetClass}>Reset</Link>
      </AdminFilterBar>
      <AdminCard>
        <AdminTable
          head={["Headline", "Language", "Status", "Mobile", "Scheduled", "Delivered", "Failed", "Updated", ""]}
          empty="No editorial editions match these filters."
          rows={issues.map((issue) => [
            <span key="h" className="block min-w-[220px] font-medium text-admin-ink">{issue.headline || "Untitled edition"}</span>,
            issue.readingLanguage,
            <StatusBadge key="s" value={issue.status} />,
            <span key="mobile" className={`whitespace-nowrap text-[11.5px] ${issue.mobileEnabled ? "text-emerald-700" : "text-admin-muted"}`}>{issue.mobileEnabled ? `${issue.mobileExploreEnabled ? "Explore" : "Home"}${issue.mobileListenEnabled ? " + Listen" : ""}` : "Hidden"}</span>,
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
