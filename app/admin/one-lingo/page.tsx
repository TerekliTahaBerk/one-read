import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneLingoTabs } from "@/lib/admin/nav";
import { getLingoOverviewMetrics } from "@/lib/admin/lingo-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneLingoOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-lingo", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const m = await getLingoOverviewMetrics();

  return (
    <AdminShell title="OneLingo" subtitle="Daily language-practice operations">
      <AdminTabs tabs={oneLingoTabs()} active="overview" />
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
      <AdminCard title={`Today's lessons · ${m.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Lessons" value={m.lessons.total} />
          <MetricCard label="Approved / scheduled" value={m.lessons.approvedOrScheduled} />
          <MetricCard label="Needs review" value={m.lessons.needsReview} tone={m.lessons.needsReview > 0 ? "warn" : "default"} />
          <MetricCard label="Not generated" value={m.lessons.notGenerated} tone={m.lessons.notGenerated > 0 ? "warn" : "default"} />
          <MetricCard label="Sent" value={m.sends.sent} tone="good" />
          <MetricCard label="Skipped" value={m.sends.skipped} />
          <MetricCard label="Failed" value={m.sends.failed} tone={m.sends.failed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>
      <div className="flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-lingo/lessons" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Lessons</Link>
        <Link href="/admin/one-lingo/subscribers" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Subscribers</Link>
        <Link href="/admin/one-lingo/sends" className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">Send logs</Link>
      </div>
    </AdminShell>
  );
}
