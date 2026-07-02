import { prisma } from "@/lib/prisma";
import { ONE_READ_PRODUCT_KEY } from "@/lib/options";

export interface OneReadOverviewMetrics {
  total: number;
  activeOrTrialing: number;
  pendingCheckout: number;
  pendingPreferences: number;
}

/** Lightweight subscriber counts for the /admin/products overview table. */
export async function getOneReadOverviewMetrics(): Promise<OneReadOverviewMetrics> {
  const rows = await prisma.productSubscription.groupBy({
    by: ["status"],
    where: { productKey: ONE_READ_PRODUCT_KEY },
    _count: { _all: true },
  });

  const byStatus = new Map(rows.map((r) => [r.status, r._count._all]));
  const activeOrTrialing =
    (byStatus.get("ACTIVE_PAID") ?? 0) +
    (byStatus.get("TRIALING") ?? 0) +
    (byStatus.get("ADMIN_OVERRIDE") ?? 0);

  return {
    total: rows.reduce((sum, r) => sum + r._count._all, 0),
    activeOrTrialing,
    pendingCheckout: byStatus.get("PENDING_CHECKOUT") ?? 0,
    pendingPreferences: byStatus.get("PENDING_PREFERENCES") ?? 0,
  };
}
