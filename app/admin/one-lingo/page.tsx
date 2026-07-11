import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { HealthHeadline, FactList, type Health } from "@/components/admin/HealthCard";
import { Details } from "@/components/admin/Details";
import { ApproveAllButton } from "@/components/admin/ApproveAllButton";
import { ProductRunActions } from "@/components/admin/ProductRunActions";
import { oneLingoTabs } from "@/lib/admin/nav";
import { getLingoOverviewMetrics } from "@/lib/admin/lingo-queries";
import { getLingoHealth, aiBrainWorking } from "@/lib/admin/health";
import { lingoBillingConfigured } from "@/lib/lingo/config";
import { getControls } from "@/lib/admin/settings-store";
import { getRunSnapshot, runStatusLabel } from "@/lib/admin/operational-runs";
import { ONE_LINGO_PRODUCT_KEY } from "@/lib/options";
import { fmtWhen } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneLingoOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-lingo", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [m, health, run] = await Promise.all([
    getLingoOverviewMetrics(),
    getLingoHealth(),
    getRunSnapshot(ONE_LINGO_PRODUCT_KEY),
  ]);
  const controls = (await getControls()).lingo;
  const cronOn = controls.cronEnabled;
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
              ["Approval required", controls.requireApproval ? "Yes" : "No"],
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

      <AdminCard title="Run now" subtitle="Generate or send today's lesson on demand" bodyClassName="p-4">
        <ProductRunActions endpoint="/api/admin/lingo/lessons/action" productName="OneLingo" />
      </AdminCard>

      <AdminCard title="Automatic runs" subtitle="The daily job that generates and sends" bodyClassName="p-4">
        <FactList
          rows={[
            ["Last run", run.last ? `${fmtWhen(run.last.startedAt)} · ${runStatusLabel(run.last.status)}` : "Never run yet"],
            ["Last successful run", run.lastSuccessAt ? fmtWhen(run.lastSuccessAt) : "None yet"],
            ["Last error", run.lastFailure ? `${fmtWhen(run.lastFailure.startedAt)} — ${run.lastFailure.error ?? "unknown"}` : "None"],
          ]}
        />
      </AdminCard>

      <AdminCard title="Approvals" subtitle="Clear today's review queue in one click" bodyClassName="p-4">
        <p className="mb-3 text-[12.5px] text-admin-body font-sans">
          Approves every lesson that&apos;s ready for today. Anything not
          generated stays in review.
        </p>
        <ApproveAllButton endpoint="/api/admin/lingo/lessons/action" label="Approve all ready today" />
      </AdminCard>

      <div className="flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-lingo/lessons" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Lessons</Link>
        <Link href="/admin/one-lingo/subscribers" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Subscribers</Link>
        <Link href="/admin/one-lingo/sends" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Send logs</Link>
      </div>
    </AdminShell>
  );
}
