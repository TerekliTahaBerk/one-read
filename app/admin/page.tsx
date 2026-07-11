import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid, DefList } from "@/components/admin/AdminCard";
import { HealthHeadline, ProductHealthCard, type Health } from "@/components/admin/HealthCard";
import { Details } from "@/components/admin/Details";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOverviewMetrics } from "@/lib/admin/queries";
import {
  getOneArticleHealth,
  getFilmHealth,
  getLingoHealth,
  getOneReadHealth,
} from "@/lib/admin/health";
import { fmtAgo, fmtWhen } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin — the at-a-glance home. One health line for the whole system, one calm
 * card per product (is today's issue ready, is automatic sending on, how many
 * subscribers), and all the raw numbers tucked into a Details disclosure.
 */
export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [m, oneArticle, film, lingo, oneRead] = await Promise.all([
    getOverviewMetrics(),
    getOneArticleHealth(),
    getFilmHealth(),
    getLingoHealth(),
    getOneReadHealth(),
  ]);

  const products = [oneArticle, film, lingo, oneRead];
  const problems = products.filter((p) => p.health === "problem").length;
  const attention = products.filter((p) => p.health === "attention").length;

  const systemHealth: Health = problems > 0 ? "problem" : attention > 0 ? "attention" : "ok";
  const systemHeadline =
    problems > 0
      ? `${problems} product${problems === 1 ? "" : "s"} need${problems === 1 ? "s" : ""} attention`
      : attention > 0
        ? `${attention} product${attention === 1 ? "" : "s"} to look at`
        : "Everything is running";
  const systemDetail =
    systemHealth === "ok"
      ? "All products are healthy. Nothing needs you right now."
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

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
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
          <MetricCard label="Getting emails" value={m.users.subscribed} tone="good" />
          <MetricCard label="Unsubscribed" value={m.users.paused} />
          <MetricCard
            label="Bounced / blocked"
            value={m.users.suppressed}
            tone={m.users.suppressed > 0 ? "warn" : "default"}
          />
          <MetricCard label="Joined today" value={m.users.newToday} />
          <MetricCard label="Joined this week" value={m.users.new7d} />
          <MetricCard label="Joined this month" value={m.users.new30d} />
          <MetricCard label="Ready to receive" value={m.eligibleCount} tone="good" />
        </MetricGrid>
        <Link href="/admin/users" className="text-[13px] text-admin-ink underline underline-offset-2">
          View everyone →
        </Link>
      </AdminCard>

      <Details summary="Technical details — subscriptions, billing, content">
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
                ["Articles ingested", String(m.content.articles)],
                ["Scored articles", String(m.content.scoredArticles)],
                ["Summaries generated", String(m.content.summaries)],
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
