import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { loadSourceOverview } from "@/lib/admin/sources";
import { SourceActiveToggle, SourceClearErrorButton } from "@/components/admin/SourceControls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/sources — the intervention point for a broken feed.
 *
 * Everything here answers one of three operator questions: is this feed on,
 * is it still working, and is it producing anything worth reading.
 */
export default async function AdminSourcesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/sources", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const overview = await loadSourceOverview();

  return (
    <AdminShell
      title="Article sources"
      subtitle="Feeds the article pipeline reads, their last fetch, and what they produced"
    >
      {overview.usingSeedFallback && (
        <div className="mb-6 rounded-[18px] border border-admin-line-strong bg-admin-surface p-4 font-sans text-[13px] leading-5 text-admin-body sm:p-5">
          <strong className="font-medium text-admin-ink">No feed is enabled here.</strong>{" "}
          Ingestion is running from the {overview.seedSourceCount} feeds built into the
          application instead. Enabling any source below takes over from that fallback
          entirely — so enable every feed you want read, not just one.
        </div>
      )}

      <MetricGrid>
        <MetricCard label="Enabled feeds" value={overview.activeCount} tone={overview.activeCount > 0 ? "good" : "warn"} />
        <MetricCard label="Known feeds" value={overview.rows.length} hint="Enabled and disabled" />
        <MetricCard
          label="Reporting an error"
          value={overview.erroringCount}
          tone={overview.erroringCount > 0 ? "warn" : "default"}
          hint="Last fetch failed"
        />
        <MetricCard
          label="Never fetched"
          value={overview.neverFetchedCount}
          hint="No ingest run has touched these yet"
        />
      </MetricGrid>

      <AdminCard
        title="Feeds"
        subtitle="Article counts are matched by source name, the only key articles record."
      >
        <AdminTable
          head={[
            "Source",
            "Topic",
            "Language",
            "Enabled",
            "Last fetch",
            "Articles (7d)",
            "Articles (total)",
            "Last error",
          ]}
          empty="No sources have been added to the database yet."
          rows={overview.rows.map((source) => [
            <div key="source" className="min-w-56">
              <div className="font-medium text-admin-ink">{source.name}</div>
              <div className="mt-0.5 break-all text-[10.5px] text-admin-muted">{source.feedUrl}</div>
              {source.notes && (
                <div className="mt-0.5 text-[10.5px] text-admin-muted">{source.notes}</div>
              )}
            </div>,
            source.defaultTopic,
            source.language,
            <SourceActiveToggle
              key="active"
              slug={source.slug}
              name={source.name}
              active={source.active}
              blockedInCode={source.blockedInCode}
            />,
            source.lastFetchedAt ? fmtDateTime(source.lastFetchedAt) : "Never",
            source.recentArticles,
            source.totalArticles,
            source.lastError ? (
              <div key="error" className="min-w-56">
                <div className="text-dawn" title={source.lastError}>
                  {source.lastError.length > 120
                    ? `${source.lastError.slice(0, 120)}…`
                    : source.lastError}
                </div>
                <div className="mt-1">
                  <SourceClearErrorButton slug={source.slug} />
                </div>
              </div>
            ) : (
              "—"
            ),
          ])}
        />
      </AdminCard>

      <p className="font-sans text-[12px] leading-5 text-admin-muted">
        A feed error is recorded by the ingest run, not by this screen. Marking one reviewed
        only clears the note — the next run rewrites it if the feed is still broken.
      </p>
    </AdminShell>
  );
}
