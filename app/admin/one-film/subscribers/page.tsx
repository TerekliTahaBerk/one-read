import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmSubscribers } from "@/lib/admin/film-queries";
import { evaluateFilmEligibility } from "@/lib/film/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmSubscribersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-film/subscribers", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const subs = await getFilmSubscribers();

  return (
    <AdminShell title="OneFilm subscribers" subtitle="ProductSubscription rows for one-film">
      <AdminTabs tabs={oneFilmTabs()} active="subscribers" />
      <AdminCard>
        {subs.length === 0 ? (
          <AdminEmptyState>No OneFilm subscribers yet.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-admin-line text-admin-muted">
              <tr>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Delivery</th>
                <th className="px-4 py-2">Prefs</th>
                <th className="px-4 py-2">Provider</th>
                <th className="px-4 py-2">Eligible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-line/70">
              {subs.map((sub) => {
                const eligible = evaluateFilmEligibility(sub);
                const prefs = sub.filmPreferences;
                return (
                  <tr key={sub.id}>
                    <td className="px-4 py-2 text-admin-ink">{sub.contact.email}</td>
                    <td className="px-4 py-2 text-admin-body">{sub.status}</td>
                    <td className="px-4 py-2 text-admin-body">{sub.emailDeliveryStatus}</td>
                    <td className="px-4 py-2 text-admin-body">
                      {prefs ? `${prefs.emailLanguage} / ${prefs.preferredGenres.slice(0, 3).join(", ") || "—"}` : "Missing"}
                    </td>
                    <td className="px-4 py-2 text-admin-body">{sub.paymentProvider ?? "—"}</td>
                    <td className="px-4 py-2 text-admin-body">{eligible.allowed ? "Yes" : eligible.reason}</td>
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
