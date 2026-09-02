import Link from "next/link";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { ONE_ARTICLE_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";

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

  const [byStatus, rows, legacyCount] = await Promise.all([
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
  ]);

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
            hint="Grandfathered $1 subscribers — never repriced"
          />
        </MetricGrid>
      </AdminCard>

      <AdminCard title="Subscriptions" subtitle="100 most recently updated">
        <AdminTable
          head={[
            "State",
            "Plan",
            "Period end",
            "Latest paid",
            "Cancels at period end",
            "Polar customer",
            "Polar subscription",
          ]}
          empty="No billing subscriptions recorded."
          rows={rows.map((row) => [
            <StatusBadge key="state" value={row.status} />,
            row.plan ?? "Legacy / unspecified",
            fmtDateTime(row.currentPeriodEnd),
            fmtDateTime(row.paidAt),
            row.cancelAtPeriodEnd ? "Yes" : "No",
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
