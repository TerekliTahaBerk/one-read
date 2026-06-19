import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneNewsTabs } from "@/lib/admin/nav";
import { getNewsSends } from "@/lib/admin/news-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsSendsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-news/sends", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const sends = await getNewsSends();

  return (
    <AdminShell title="OneNews sends" subtitle="Daily send idempotency log">
      <AdminTabs tabs={oneNewsTabs()} active="sends" />
      <AdminCard>
        {sends.length === 0 ? (
          <AdminEmptyState>No OneNews send rows yet.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-line text-fog">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Issue</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {sends.map((send) => (
                <tr key={send.id}>
                  <td className="px-4 py-2 text-ash">{send.issueDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-ink">{send.contact.email}</td>
                  <td className="px-4 py-2 text-ash">{send.issue.title}</td>
                  <td className="px-4 py-2 text-ash">{send.status}</td>
                  <td className="px-4 py-2 text-ash">{send.skippedReason ?? send.failedReason ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
