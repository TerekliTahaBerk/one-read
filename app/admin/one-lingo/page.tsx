import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { HealthHeadline, FactList, type Health } from "@/components/admin/HealthCard";
import { Details } from "@/components/admin/Details";
import { oneLingoTabs } from "@/lib/admin/nav";
import { getLingoOverviewMetrics } from "@/lib/admin/lingo-queries";
import { getLingoHealth, aiBrainWorking } from "@/lib/admin/health";
import { lingoBillingConfigured, lingoCronEnabled, lingoRequireApproval } from "@/lib/lingo/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneLingoOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-lingo", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [m, health] = await Promise.all([getLingoOverviewMetrics(), getLingoHealth()]);
  const cronOn = lingoCronEnabled();
  const aiOk = aiBrainWorking();

  const nextAction = !cronOn
    ? "Turn on automatic sending when you're ready to deliver"
    : m.lessons.approvedOrScheduled > 0
      ? "Today's lesson is ready to go"
      : "Prepare and approve today's lesson";

  return (
    <AdminShell title="OneLingo" subtitle="A small language practice, every morning">
      <AdminTabs tabs={oneLingoTabs()} active="overview" />

      <AdminCard bodyClassName="p-4">
        <HealthHeadline health={health.health as Health} headline={health.headline} detail={nextAction} />
      </AdminCard>

      <AdminCard title="At a glance" bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FactList
            rows={[
              ["Today's lesson", m.lessons.approvedOrScheduled > 0 ? "Ready" : m.lessons.total > 0 ? "Being prepared" : "Nothing yet"],
              ["Automatic sending", cronOn ? "On" : "Off"],
              ["AI brain", aiOk ? "Working" : "Needs setup"],
            ]}
          />
          <FactList
            rows={[
              ["Subscribers ready", `${m.subscribers.eligible}`],
              ["Payments", lingoBillingConfigured() ? "Connected" : "Needs setup"],
              ["Approval required", lingoRequireApproval() ? "Yes" : "No"],
            ]}
          />
        </div>
      </AdminCard>

      <AdminCard title="Subscribers" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Total" value={m.subscribers.total} />
          <MetricCard label="Ready to receive" value={m.subscribers.eligible} tone="good" />
          <MetricCard label="Setting up" value={m.subscribers.pendingPreferences} />
          <MetricCard label="Awaiting payment" value={m.subscribers.pendingCheckout} />
          <MetricCard label="Active / trialing" value={m.subscribers.activeOrTrialing} tone="good" />
          <MetricCard label="Unsubscribed" value={m.subscribers.paused} />
          <MetricCard label="Bounced / blocked" value={m.subscribers.suppressed} tone={m.subscribers.suppressed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>

      <AdminCard title={`Today's delivery · ${m.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Lessons prepared" value={m.lessons.total} />
          <MetricCard label="Approved / scheduled" value={m.lessons.approvedOrScheduled} />
          <MetricCard label="Needs review" value={m.lessons.needsReview} tone={m.lessons.needsReview > 0 ? "warn" : "default"} />
          <MetricCard label="Not prepared" value={m.lessons.notGenerated} tone={m.lessons.notGenerated > 0 ? "warn" : "default"} />
          <MetricCard label="Delivered" value={m.sends.sent} tone="good" />
          <MetricCard label="Skipped" value={m.sends.skipped} />
          <MetricCard label="Failed" value={m.sends.failed} tone={m.sends.failed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>

      <div className="flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-lingo/lessons" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Lessons</Link>
        <Link href="/admin/one-lingo/subscribers" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Subscribers</Link>
        <Link href="/admin/one-lingo/sends" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Send logs</Link>
      </div>
    </AdminShell>
  );
}
