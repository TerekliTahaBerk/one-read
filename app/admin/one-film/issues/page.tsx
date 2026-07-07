import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmIssues } from "@/lib/admin/film-queries";

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
    <AdminShell title="OneFilm notes" subtitle="Generated segment film notes">
      <AdminTabs tabs={oneFilmTabs()} active="issues" />
      <AdminCard>
        {issues.length === 0 ? (
          <AdminEmptyState>No OneFilm notes generated yet.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-admin-line text-admin-muted">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Film</th>
                <th className="px-4 py-2">Segment</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Approval</th>
                <th className="px-4 py-2">Sends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line/70">
              {issues.map((issue) => (
                <tr key={issue.id}>
                  <td className="px-4 py-2 text-admin-body">{issue.issueDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-admin-ink">
                    <Link className="link-underline" href={`/admin/one-film/issues/${issue.id}`}>
                      {issue.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-admin-body">{issue.filmTitle ?? "—"}</td>
                  <td className="px-4 py-2 text-admin-body">{issue.segmentKey}</td>
                  <td className="px-4 py-2 text-admin-body">{issue.status}</td>
                  <td className="px-4 py-2 text-admin-body">{issue.approvalStatus}</td>
                  <td className="px-4 py-2 text-admin-body">{issue._count.sends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
