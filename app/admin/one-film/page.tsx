import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmOverviewMetrics } from "@/lib/admin/film-queries";
import { filmBillingConfigured, filmCronEnabled, filmRequireApproval, filmSourceMode } from "@/lib/film/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-film", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const m = await getFilmOverviewMetrics();

  return (
    <AdminShell title="OneFilm" subtitle="Daily film-note operations">
      <AdminTabs tabs={oneFilmTabs()} active="overview" />
      <AdminCard title="Configuration" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Polar product" value={filmBillingConfigured() ? "Configured" : "Missing"} tone={filmBillingConfigured() ? "good" : "warn"} />
          <MetricCard label="Cron" value={filmCronEnabled() ? "Enabled" : "Disabled"} />
          <MetricCard label="Approval required" value={filmRequireApproval() ? "Yes" : "No"} />
          <MetricCard label="Source mode" value={filmSourceMode()} />
        </MetricGrid>
      </AdminCard>
      <AdminCard title="Subscribers" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Total" value={m.subscribers.total} />
          <MetricCard label="Eligible" value={m.subscribers.eligible} tone="good" />
          <MetricCard label="Pending preferences" value={m.subscribers.pendingPreferences} />
          <MetricCard label="Pending checkout" value={m.subscribers.pendingCheckout} />
          <MetricCard label="Active / trialing" value={m.subscribers.activeOrTrialing} tone="good" />
          <MetricCard label="Email paused" value={m.subscribers.paused} />
          <MetricCard label="Suppressed" value={m.subscribers.suppressed} tone={m.subscribers.suppressed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>
      <AdminCard title={`Today's notes · ${m.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Notes" value={m.issues.total} />
          <MetricCard label="Approved / scheduled" value={m.issues.approvedOrScheduled} />
          <MetricCard label="No film available" value={m.issues.noFilm} tone={m.issues.noFilm > 0 ? "warn" : "default"} />
          <MetricCard label="Catalog films" value={m.catalog.total} />
          <MetricCard label="Sent" value={m.sends.sent} tone="good" />
          <MetricCard label="Skipped" value={m.sends.skipped} />
          <MetricCard label="Failed" value={m.sends.failed} tone={m.sends.failed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>
      <div className="flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-film/issues" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Notes</Link>
        <Link href="/admin/one-film/catalog" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Catalog</Link>
        <Link href="/admin/one-film/subscribers" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Subscribers</Link>
        <Link href="/admin/one-film/sends" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Send logs</Link>
      </div>
    </AdminShell>
  );
}
