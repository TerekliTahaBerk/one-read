import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, AdminEmptyState } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmCatalog } from "@/lib/admin/film-queries";
import { FilmCatalogForm } from "@/components/admin/FilmCatalogForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmCatalogPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-film/catalog", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const films = await getFilmCatalog();

  return (
    <AdminShell title="OneFilm catalog" subtitle="Real, admin-curated films — OneFilm never invents factual metadata">
      <AdminTabs tabs={oneFilmTabs()} active="catalog" />
      <AdminCard title="Add a film" bodyClassName="p-4">
        <FilmCatalogForm />
      </AdminCard>
      <AdminCard title="Catalog">
        {films.length === 0 ? (
          <AdminEmptyState>No films in the catalog yet. Add real films above before generating notes.</AdminEmptyState>
        ) : (
          <table className="w-full text-left text-[12.5px] font-sans">
            <thead className="border-b border-line text-fog">
              <tr>
                <th className="px-4 py-2">Title</th>
                <th className="px-4 py-2">Year</th>
                <th className="px-4 py-2">Director</th>
                <th className="px-4 py-2">Genres</th>
                <th className="px-4 py-2">Spoiler</th>
                <th className="px-4 py-2">Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {films.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2 text-ink">{f.title}</td>
                  <td className="px-4 py-2 text-ash">{f.year ?? "—"}</td>
                  <td className="px-4 py-2 text-ash">{f.director ?? "—"}</td>
                  <td className="px-4 py-2 text-ash">{f.genres.join(", ") || "—"}</td>
                  <td className="px-4 py-2 text-ash">{f.spoilerLevel}</td>
                  <td className="px-4 py-2 text-ash">{f.usedAt ? f.usedAt.toISOString().slice(0, 10) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminCard>
    </AdminShell>
  );
}
