import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmIssues } from "@/lib/admin/film-queries";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { QuickIssueAction } from "@/components/admin/QuickIssueAction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmIssuesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-film/issues", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const issues = await getFilmIssues();

  return (
    <AdminShell title="OneFilm notes" subtitle="Every film note prepared so far">
      <AdminTabs tabs={oneFilmTabs()} active="issues" />
      <AdminCard>
        {issues.length === 0 ? (
          <AdminEmptyState>No OneFilm notes generated yet.</AdminEmptyState>
        ) : (
          <AdminTable head={["Date", "Subject", "Film", "Segment", "Status", "Approval", "Sends", ""]} rows={issues.map((issue) => [
            issue.issueDate.toISOString().slice(0, 10),
            <Link key="subject" className="link-underline" href={`/admin/one-film/issues/${issue.id}`}>{issue.subject}</Link>,
            issue.filmTitle ?? "—", issue.segmentKey, <StatusBadge key="status" value={issue.status} />,
            <StatusBadge key="approval" value={issue.approvalStatus} />, issue._count.sends,
            issue.approvalStatus === "PENDING" && issue.status === "GENERATED" ? <QuickIssueAction key="action" endpoint="/api/admin/film/issues/action" idKey="issueId" id={issue.id} action="approve" label="Approve" /> : null,
          ])} />
        )}
      </AdminCard>
    </AdminShell>
  );
}
