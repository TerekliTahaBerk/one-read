import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneNewsTabs } from "@/lib/admin/nav";
import { getNewsOverviewMetrics } from "@/lib/admin/news-queries";
import { newsBillingConfigured, newsCronEnabled, newsRequireApproval, newsSourceMode } from "@/lib/news/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-news", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const m = await getNewsOverviewMetrics();

  return (
    <AdminShell title="OneNews" subtitle="Calm morning-briefing operations">
      <AdminTabs tabs={oneNewsTabs()} active="overview" />
      <AdminCard title="Configuration" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Polar product" value={newsBillingConfigured() ? "Configured" : "Missing"} tone={newsBillingConfigured() ? "good" : "warn"} />
          <MetricCard label="Cron" value={newsCronEnabled() ? "Enabled" : "Disabled"} />
          <MetricCard label="Approval required" value={newsRequireApproval() ? "Yes" : "No"} />
          <MetricCard label="Source mode" value={newsSourceMode()} />
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
      <AdminCard title={`Today's issues · ${m.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Issues" value={m.issues.total} />
          <MetricCard label="Approved / scheduled" value={m.issues.approvedOrScheduled} />
          <MetricCard label="No source material" value={m.issues.noSources} tone={m.issues.noSources > 0 ? "warn" : "default"} />
          <MetricCard label="Source stories (3d)" value={m.sources.recentWindow} />
          <MetricCard label="Sent" value={m.sends.sent} tone="good" />
          <MetricCard label="Skipped" value={m.sends.skipped} />
          <MetricCard label="Failed" value={m.sends.failed} tone={m.sends.failed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>
      <div className="flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-news/issues" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Issues</Link>
        <Link href="/admin/one-news/sources" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Sources</Link>
        <Link href="/admin/one-news/subscribers" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Subscribers</Link>
        <Link href="/admin/one-news/sends" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Send logs</Link>
      </div>
    </AdminShell>
  );
}
