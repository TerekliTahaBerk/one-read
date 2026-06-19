import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneNewsTabs } from "@/lib/admin/nav";
import { getNewsSourceStories } from "@/lib/admin/news-queries";
import { NewsSourceForm } from "@/components/admin/NewsSourceForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsSourcesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-news/sources", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const stories = await getNewsSourceStories();
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <AdminShell title="OneNews sources" subtitle="Real, admin-curated source stories — OneNews never invents news">
      <AdminTabs tabs={oneNewsTabs()} active="sources" />
      <AdminCard title="Add a source story" bodyClassName="p-4">
        <NewsSourceForm defaultDateIso={todayIso} />
      </AdminCard>
      <AdminCard title="Recent source stories">
        {stories.length === 0 ? (
          <AdminEmptyState>No source material yet. Add real stories above before generating issues.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-line text-fog">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Headline</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Topic</th>
                <th className="px-4 py-2">Region</th>
                <th className="px-4 py-2">Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {stories.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-ash">{s.storyDate.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-2 text-ink">{s.headline}</td>
                  <td className="px-4 py-2 text-ash">
                    <a className="link-underline" href={s.sourceUrl} target="_blank" rel="noopener noreferrer">{s.sourceName}</a>
                  </td>
                  <td className="px-4 py-2 text-ash">{s.topic}</td>
                  <td className="px-4 py-2 text-ash">{s.region}</td>
                  <td className="px-4 py-2 text-ash">{s.usedAt ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
