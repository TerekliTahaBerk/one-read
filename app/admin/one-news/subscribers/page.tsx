import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneNewsTabs } from "@/lib/admin/nav";
import { getNewsSubscribers } from "@/lib/admin/news-queries";
import { evaluateNewsEligibility } from "@/lib/news/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsSubscribersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-news/subscribers", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const subs = await getNewsSubscribers();

  return (
    <AdminShell title="OneNews subscribers" subtitle="ProductSubscription rows for one-news">
      <AdminTabs tabs={oneNewsTabs()} active="subscribers" />
      <AdminCard>
        {subs.length === 0 ? (
          <AdminEmptyState>No OneNews subscribers yet.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-line text-fog">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Delivery</th>
                <th className="px-4 py-2">Prefs</th>
                <th className="px-4 py-2">Provider</th>
                <th className="px-4 py-2">Eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {subs.map((sub) => {
                const eligible = evaluateNewsEligibility(sub);
                const prefs = sub.newsPreferences;
                return (
                  <tr key={sub.id}>
                    <td className="px-4 py-2 text-ink">{sub.contact.email}</td>
                    <td className="px-4 py-2 text-ash">{sub.status}</td>
                    <td className="px-4 py-2 text-ash">{sub.emailDeliveryStatus}</td>
                    <td className="px-4 py-2 text-ash">
                      {prefs ? `${prefs.briefingLanguage} / ${prefs.regionFocus}` : "Missing"}
                    </td>
                    <td className="px-4 py-2 text-ash">{sub.paymentProvider ?? "—"}</td>
                    <td className="px-4 py-2 text-ash">{eligible.allowed ? "Yes" : eligible.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
