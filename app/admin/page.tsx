import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid, DefList } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { PRODUCTS, WAITLIST_NOTE } from "@/lib/admin/products";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin — OneRead-level operations dashboard. Calm, dense, read-only top-level
 * view of users, subscriptions, payments, products, and today's delivery.
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const guard = guardAdminPage(searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const { token } = guard;
  const q = `?token=${encodeURIComponent(token)}`;

  const m = await getOverviewMetrics();

  const accessOrder = [
    "ACTIVE_PAID",
    "TRIALING",
    "ADMIN_OVERRIDE",
    "PENDING_CHECKOUT",
    "PENDING_PREFERENCES",
    "PAST_DUE",
    "CANCELED",
    "TRIAL_EXPIRED",
    "EXPIRED",
  ];

  return (
    <AdminShell
      token={token}
      title="Overview"
      subtitle="OneRead operations · all figures from live data"
    >
      {/* Users */}
      <AdminCard title="Users" subtitle={`${m.users.totalContacts} contacts`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Total contacts" value={m.users.totalContacts} />
          <MetricCard label="Email subscribed" value={m.users.subscribed} tone="good" />
          <MetricCard label="Email paused" value={m.users.paused} />
          <MetricCard
            label="Suppressed"
            value={m.users.suppressed}
            tone={m.users.suppressed > 0 ? "warn" : "default"}
          />
          <MetricCard label="New today" value={m.users.newToday} />
          <MetricCard label="New · 7 days" value={m.users.new7d} />
          <MetricCard label="New · 30 days" value={m.users.new30d} />
          <MetricCard
            label="Eligible for email"
            value={m.eligibleCount}
            hint="passes canReceiveOneArticleEmail"
            tone="good"
          />
        </MetricGrid>
      </AdminCard>

      {/* Subscriptions */}
      <AdminCard title="Subscriptions" subtitle="OneArticle access states">
        <DefList
          rows={accessOrder
            .filter((k) => (m.access[k] ?? 0) > 0)
            .map((k) => [
              <StatusBadge key={k} value={k} />,
              <span key="v">{m.access[k]}</span>,
            ])}
        />
        {Object.keys(m.access).length === 0 && (
          <div className="px-4 py-6 text-[13px] text-fog">No subscriptions yet.</div>
        )}
      </AdminCard>

      {/* Payment */}
      <AdminCard title="Payment" subtitle="Providers, plans, and renewals" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Paid users" value={m.payment.paidCount} />
          <MetricCard
            label="Renewals · 7 days"
            value={m.payment.renewals7d}
            hint="period ends within 7d"
          />
          <MetricCard
            label="Renewals · 30 days"
            value={m.payment.renewals30d}
            hint="period ends within 30d"
          />
          <MetricCard label="Last payment" value="—" hint="see user detail" />
        </MetricGrid>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SmallBreakdown title="Provider" data={m.payment.providers} />
          <SmallBreakdown title="Plan" data={m.payment.plans} />
        </div>
      </AdminCard>

      {/* Products */}
      <AdminCard title="Products" subtitle="OneRead family">
        <DefList
          rows={PRODUCTS.map((p) => [
            <span key="n" className="flex items-center gap-2">
              <Link
                href={p.key === "one-article" ? `/admin/one-article${q}` : `/admin/products${q}`}
                className="text-ink underline underline-offset-2 hover:text-graphite"
              >
                {p.name}
              </Link>
              <StatusBadge
                value={p.status === "live" ? "live" : "waitlist"}
                tone={p.status === "live" ? "good" : "muted"}
              />
            </span>,
            p.connected ? (
              <span key="v">
                {p.key === "one-article"
                  ? `${m.users.subscribed} active email subscribers · ${m.eligibleCount} eligible`
                  : "connected"}
              </span>
            ) : (
              <span key="v" className="text-fog">{WAITLIST_NOTE}</span>
            ),
          ])}
        />
      </AdminCard>

      {/* Daily operations */}
      <AdminCard title="Today's delivery" subtitle={m.ops.isoDate} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Prepared issues" value={m.ops.picksToday} />
          <MetricCard label="Approved / scheduled" value={m.ops.approvedToday} />
          <MetricCard label="Sent" value={m.ops.sentToday} tone="good" />
          <MetricCard label="Queued" value={m.ops.queuedToday} />
          <MetricCard label="Skipped" value={m.ops.skippedToday} />
          <MetricCard
            label="Failed"
            value={m.ops.failedToday}
            tone={m.ops.failedToday > 0 ? "warn" : "default"}
          />
        </MetricGrid>
        <DefList
          rows={[
            ["Next scheduled send", `${m.ops.nextSendUtc} · 07:00 Europe/Istanbul`],
            ["Last successful send", fmtDateTime(m.ops.lastSendAt)],
            [
              "Today's issues",
              <Link key="l" href={`/admin/one-article/issues${q}`} className="text-ink underline underline-offset-2">
                View issues →
              </Link>,
            ],
          ]}
        />
      </AdminCard>
    </AdminShell>
  );
}

function SmallBreakdown({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  return (
    <div className="border border-line rounded-xl bg-paper/60 px-4 py-3">
      <div className="text-[11px] uppercase tracking-eyebrow text-fog font-sans mb-2">
        {title}
      </div>
      {entries.length === 0 ? (
        <div className="text-[12.5px] text-fog">None</div>
      ) : (
        <ul className="space-y-1">
          {entries.map(([k, v]) => (
            <li key={k} className="flex justify-between text-[12.5px] text-ink/90">
              <span className="font-mono text-ash">{k}</span>
              <span>{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
