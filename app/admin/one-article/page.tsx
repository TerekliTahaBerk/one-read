import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { oneArticleTabs } from "@/lib/admin/nav";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/one-article — operations overview for the live OneArticle product. */
export default async function OneArticleOverviewPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const guard = guardAdminPage(searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const { token } = guard;
  const q = `?token=${encodeURIComponent(token)}`;

  const m = await getOverviewMetrics();

  return (
    <AdminShell token={token} title="OneArticle" subtitle="Daily editorial operations">
      <AdminTabs tabs={oneArticleTabs(token)} active="overview" />

      <AdminCard title="Subscribers" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Email subscribed" value={m.users.subscribed} tone="good" />
          <MetricCard label="Eligible" value={m.eligibleCount} tone="good" />
          <MetricCard label="Email paused" value={m.users.paused} />
          <MetricCard label="Suppressed" value={m.users.suppressed} tone={m.users.suppressed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>

      <AdminCard title={`Today's delivery · ${m.ops.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Prepared issues" value={m.ops.picksToday} />
          <MetricCard label="Approved / scheduled" value={m.ops.approvedToday} />
          <MetricCard label="Sent" value={m.ops.sentToday} tone="good" />
          <MetricCard label="Skipped" value={m.ops.skippedToday} />
          <MetricCard label="Failed" value={m.ops.failedToday} tone={m.ops.failedToday > 0 ? "warn" : "default"} />
        </MetricGrid>
        <p className="text-[12.5px] text-ash font-sans">
          Next scheduled send: {m.ops.nextSendUtc} (07:00 Europe/Istanbul). Last
          successful send: {fmtDateTime(m.ops.lastSendAt)}.
        </p>
      </AdminCard>

      <div className="flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href={`/admin/one-article/issues${q}`} className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">
          Prepared issues →
        </Link>
        <Link href={`/admin/one-article/subscribers${q}`} className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">
          Subscribers →
        </Link>
        <Link href={`/admin/one-article/sends${q}`} className="rounded-lg border border-line-strong bg-paper px-3 py-2 text-ink hover:bg-cream">
          Send logs →
        </Link>
      </div>
    </AdminShell>
  );
}
