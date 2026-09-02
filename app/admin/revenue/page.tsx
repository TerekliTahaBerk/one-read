import Link from "next/link";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { ONE_ARTICLE_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { presentBilling } from "@/lib/billing/presentation";

export const dynamic = "force-dynamic";

/**
 * /admin/revenue — first-party billing visibility, not a Polar replacement.
 *
 * Everything here is read from OneRead's own `ProductSubscription` rows, which
 * the Polar webhook keeps in sync. Polar stays the source of truth for money;
 * this screen exists so an operator can answer "are people paying, and is
 * anything stuck?" without opening the Polar dashboard.
 */
export default async function RevenuePage() {
  const guard = await guardAdminPage("/admin/revenue");
  if (!guard.ok) return <AdminNotConfigured />;

  const [byStatus, rows, legacyCount, pendingChanges] = await Promise.all([
    prisma.productSubscription.groupBy({
      by: ["status"],
      where: { productKey: ONE_READ_PRODUCT_KEY },
      _count: { _all: true },
    }),
    prisma.productSubscription.findMany({
      where: { productKey: ONE_READ_PRODUCT_KEY },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    // Pre-umbrella subscribers still billed on their own OneArticle row.
    prisma.productSubscription.count({
      where: {
        productKey: ONE_ARTICLE_PRODUCT_KEY,
        status: { in: ["ACTIVE_PAID", "TRIALING"] },
      },
    }),
    // Plan changes Polar has accepted but not yet applied — a downgrade or an
    // annual→monthly move waiting for the next billing period.
    prisma.subscriptionTransition.findMany({
      where: { state: "PENDING_PROVIDER" },
      select: { subscriptionId: true },
    }),
  ]);

  const pendingChangeIds = new Set(pendingChanges.map((row) => row.subscriptionId));

  // Offer identity is resolved per row rather than inferred from productKey, so
  // a grandfathered $1 subscription is never displayed as the current $4 bundle.
  const presented = rows.map((row) => ({
    row,
    billing: presentBilling(row, { hasPendingChange: pendingChangeIds.has(row.id) }),
  }));
  const grandfatheredCount = presented.filter((entry) => entry.billing.grandfathered).length;
  const unidentifiedCount = presented.filter((entry) => entry.billing.unidentified).length;

  const counts = Object.fromEntries(byStatus.map((row) => [row.status, row._count._all]));

  return (
    <AdminShell
      title="Revenue · subscriptions"
      subtitle="First-party billing state. Polar remains the source of truth."
    >
      <AdminCard bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Active paid" value={counts.ACTIVE_PAID ?? 0} tone="good" />
          <MetricCard label="Admin override" value={counts.ADMIN_OVERRIDE ?? 0} />
          <MetricCard label="Trialing" value={counts.TRIALING ?? 0} />
          <MetricCard
            label="Past due"
            value={counts.PAST_DUE ?? 0}
            tone={(counts.PAST_DUE ?? 0) > 0 ? "warn" : "default"}
          />
          <MetricCard label="Canceled" value={counts.CANCELED ?? 0} />
          <MetricCard label="Awaiting checkout" value={counts.PENDING_CHECKOUT ?? 0} />
          <MetricCard
            label="Legacy OneArticle"
            value={legacyCount}
            hint="Standalone OneArticle rows, billed outside the umbrella"
          />
          <MetricCard
            label="Grandfathered"
            value={grandfatheredCount}
            hint="Closed legacy pricing — never repriced or migrated automatically"
          />
          <MetricCard
            label="Unidentified offer"
            value={unidentifiedCount}
            tone={unidentifiedCount > 0 ? "warn" : "default"}
            hint="Historical rows with no recorded offer. Access is the safe minimum."
          />
        </MetricGrid>
      </AdminCard>

      <AdminCard title="Subscriptions" subtitle="100 most recently updated">
        <AdminTable
          head={[
            "State",
            "Offer",
            "Grants",
            "Billing",
            "Period end",
            "Latest paid",
            "Cancels at period end",
            "Polar product",
            "Polar customer",
            "Polar subscription",
          ]}
          empty="No billing subscriptions recorded."
          rows={presented.map(({ row, billing }) => [
            <span key="state">
              <StatusBadge value={row.status} />
              {billing.lifecycle === "Change pending" ? (
                <span className="ml-1 text-[11px] text-admin-muted">· change pending</span>
              ) : null}
            </span>,
            <span key="offer">
              {billing.offerLabel}
              {billing.grandfathered ? (
                <span className="ml-1 text-[11px] text-admin-muted">· grandfathered</span>
              ) : null}
            </span>,
            billing.grantsLabel,
            billing.intervalLabel,
            fmtDateTime(row.currentPeriodEnd),
            fmtDateTime(row.paidAt),
            row.cancelAtPeriodEnd ? "Yes" : "No",
            <MonoShort key="product" value={row.providerProductId} />,
            <MonoShort key="customer" value={row.providerCustomerId} />,
            <MonoShort key="subscription" value={row.providerSubscriptionId} />,
          ])}
        />
      </AdminCard>

      <Link
        href="/admin/system/webhooks"
        className="font-sans text-[13px] text-admin-ink underline underline-offset-2"
      >
        Recent billing events →
      </Link>
    </AdminShell>
  );
}
