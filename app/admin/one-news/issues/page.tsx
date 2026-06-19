import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneNewsTabs } from "@/lib/admin/nav";
import { getNewsIssues } from "@/lib/admin/news-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsIssuesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-news/issues", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const issues = await getNewsIssues();

  return (
    <AdminShell title="OneNews issues" subtitle="Generated segment briefings">
      <AdminTabs tabs={oneNewsTabs()} active="issues" />
      <AdminCard>
        {issues.length === 0 ? (
          <AdminEmptyState>No OneNews issues generated yet.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-line text-fog">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Segment</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Approval</th>
                <th className="px-4 py-2">Sends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-4 py-2 text-ash">{issue.issueDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-ink">
                    <Link className="link-underline" href={`/admin/one-news/issues/${issue.id}`}>
                      {issue.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-ash">{issue.segmentKey}</td>
                  <td className="px-4 py-2 text-ash">{issue.status}</td>
                  <td className="px-4 py-2 text-ash">{issue.approvalStatus}</td>
                  <td className="px-4 py-2 text-ash">{issue._count.sends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
