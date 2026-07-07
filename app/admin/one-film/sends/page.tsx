import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmSends } from "@/lib/admin/film-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmSendsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-film/sends", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const sends = await getFilmSends();

  return (
    <AdminShell title="OneFilm sends" subtitle="Daily send idempotency log">
      <AdminTabs tabs={oneFilmTabs()} active="sends" />
      <AdminCard>
        {sends.length === 0 ? (
          <AdminEmptyState>No OneFilm send rows yet.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-admin-line text-admin-muted">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Note</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line/70">
              {sends.map((send) => (
                <tr key={send.id}>
                  <td className="px-4 py-2 text-admin-body">{send.issueDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-admin-ink">{send.contact.email}</td>
                  <td className="px-4 py-2 text-admin-body">{send.issue.title}</td>
                  <td className="px-4 py-2 text-admin-body">{send.status}</td>
                  <td className="px-4 py-2 text-admin-body">{send.skippedReason ?? send.failedReason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
