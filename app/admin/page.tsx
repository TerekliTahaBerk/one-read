import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid, DefList } from "@/components/admin/AdminCard";
import { HealthHeadline, ProductHealthCard, type Health } from "@/components/admin/HealthCard";
import { Details } from "@/components/admin/Details";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { getOneArticleHealth } from "@/lib/admin/health";
import { getSystemHealth } from "@/lib/admin/system-health";
import { getTodayDelivery } from "@/lib/admin/today";
import { fmtAgo, fmtDateTime, fmtWhen } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin — the at-a-glance home. One health line for the whole system, one calm
 * card per product (is today's issue ready, is automatic sending on, how many
 * subscribers), and all the raw numbers tucked into a Details disclosure.
 */
export default async function AdminOverviewPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [m, oneArticle, today, system] = await Promise.all([
    getOverviewMetrics(),
    getOneArticleHealth(),
    getTodayDelivery(),
    getSystemHealth(),
  ]);

  const products = [oneArticle];
  const problems = products.filter((p) => p.health === "problem").length;
  const attention = products.filter((p) => p.health === "attention").length;

  const systemHealth: Health =
    problems > 0 ? "problem" : attention > 0 || !system.healthy ? "attention" : "ok";
  const systemHeadline =
    problems > 0
      ? "Delivery needs attention"
      : !system.healthy
        ? system.headline
        : attention > 0
          ? "Publishing needs a look"
          : "OneRead operations are healthy";
  const systemDetail =
    systemHealth === "ok"
      ? "OneArticle delivery and scheduling are healthy."
      : "The cards below show exactly what needs a look.";

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
    <AdminShell title="Overview" subtitle="How everything is doing right now">
      <AdminCard bodyClassName="p-4">
        <HealthHeadline
          health={systemHealth}
          headline={systemHeadline}
          detail={systemDetail}
        />
      </AdminCard>

      <AdminCard
        title="Today"
        subtitle="Accepted means Resend took the request; delivered means a mailbox confirmed it."
        actions={
          <Link
            href="/admin/delivery/today"
            className="text-[13px] text-admin-ink underline underline-offset-2"
          >
            Delivery today →
          </Link>
        }
        bodyClassName="p-4"
      >
        {!today.issue ? (
          <p className="font-sans text-[13px] text-admin-muted">
            No edition is scheduled or sent for today.
          </p>
        ) : (
          <>
            <div className="mb-3 font-sans text-[13px] text-admin-ink">
              <span className="font-medium">{today.issue.headline}</span>
              <span className="text-admin-muted">
                {" "}
                · {today.issue.readingLanguage} · {fmtDateTime(today.issue.scheduledFor)}
              </span>{" "}
              <StatusBadge value={today.issue.status} />
            </div>
            <MetricGrid>
              <MetricCard label="Eligible" value={today.counts.total} />
              <MetricCard label="Accepted" value={today.counts.provider.ACCEPTED ?? 0} />
              <MetricCard
                label="Delivered"
                value={today.counts.provider.DELIVERED ?? 0}
                tone="good"
              />
              <MetricCard
                label="Failed"
                value={today.counts.failed}
                tone={today.counts.failed > 0 ? "warn" : "default"}
              />
              <MetricCard
                label="Ambiguous"
                value={today.counts.ambiguous}
                tone={today.counts.ambiguous > 0 ? "warn" : "default"}
              />
            </MetricGrid>
            {today.needsAttention && (
              <Link
                href="/admin/delivery/failures"
                className="text-[13px] text-dawn underline underline-offset-2"
              >
                Action required — open the recovery workbench →
              </Link>
            )}
          </>
        )}
      </AdminCard>

      <div className="mb-8 grid grid-cols-1 gap-4">
        {products.map((p) => (
          <ProductHealthCard
            key={p.key}
            name={p.name}
            href={p.href}
            health={p.health}
            headline={p.headline}
            facts={p.facts}
          />
        ))}
      </div>

      <AdminCard title="People" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Total people" value={m.users.totalContacts} />
          <MetricCard label="Joined today" value={m.users.newToday} />
          <MetricCard label="Joined this week" value={m.users.new7d} />
          <MetricCard label="Joined this month" value={m.users.new30d} />
          <MetricCard label="OneArticle subscribed" value={m.users.subscribed} tone="good" />
          <MetricCard label="OneArticle paused" value={m.users.paused} />
          <MetricCard
            label="OneArticle blocked"
            value={m.users.suppressed}
            tone={m.users.suppressed > 0 ? "warn" : "default"}
          />
          <MetricCard label="OneArticle eligible" value={m.eligibleCount} tone="good" />
        </MetricGrid>
        <Link href="/admin/users" className="text-[13px] text-admin-ink underline underline-offset-2">
          View everyone →
        </Link>
      </AdminCard>

      <AdminCard
        title="System"
        actions={
          <Link
            href="/admin/system/health"
            className="text-[13px] text-admin-ink underline underline-offset-2"
          >
            System health →
          </Link>
        }
      >
        <DefList
          rows={[
            [
              "Latest run",
              system.latestRun ? (
                <span key="run">
                  <StatusBadge value={system.latestRun.status} /> ·{" "}
                  {fmtAgo(system.latestRun.finishedAt ?? system.latestRun.startedAt)}
                </span>
              ) : (
                "No run recorded"
              ),
            ],
            ["Overdue scheduled editions", String(system.overdueIssues)],
            ["Stuck sends", String(system.staleSending)],
            ["Unprocessed billing events", String(system.unprocessedBillingEvents)],
            ["Active paid subscribers", String(m.payment.paidCount)],
          ]}
        />
      </AdminCard>

      <Details summary="Technical details — subscriptions, billing, editorial delivery">
        <div className="space-y-6">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">
              Subscriptions by state
            </div>
            {Object.keys(m.access).length === 0 ? (
              <div className="text-[13px] text-admin-muted">No subscriptions yet.</div>
            ) : (
              <DefList
                rows={accessOrder
                  .filter((k) => (m.access[k] ?? 0) > 0)
                  .map((k) => [
                    <StatusBadge key={k} value={k} />,
                    <span key="v">{m.access[k]}</span>,
                  ])}
              />
            )}
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">
              Billing
            </div>
            <DefList
              rows={[
                ["Paid subscriptions", String(m.payment.paidCount)],
                ["Renewing within 7 days", String(m.payment.renewals7d)],
                ["Renewing within 30 days", String(m.payment.renewals30d)],
                ["Revenue", "Not tracked here"],
                ["Billing webhook events", String(m.content.billingEvents)],
                ["Providers", Object.keys(m.payment.providers).join(", ") || "—"],
                ["Plans", Object.keys(m.payment.plans).join(", ") || "—"],
              ]}
            />
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">
              Content &amp; audit
            </div>
            <DefList
              rows={[
                ["Editorial editions", String(m.content.articles)],
                ["Editions fully sent", String(m.content.scoredArticles)],
                ["Recipient deliveries sent", String(m.content.summaries)],
                ["Audit events", String(m.content.auditEvents)],
                ["Last delivery", fmtWhen(m.ops.lastSendAt)],
                ["Last delivery (relative)", fmtAgo(m.ops.lastSendAt)],
              ]}
            />
            <Link
              href="/admin/audit"
              className="mt-2 inline-block text-[13px] text-admin-ink underline underline-offset-2"
            >
              View audit log →
            </Link>
          </div>
        </div>
      </Details>
    </AdminShell>
  );
}
