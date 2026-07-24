import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";

export const dynamic = "force-dynamic";
export default async function RunsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const guard = guardAdminPage("/admin/runs", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const product = typeof searchParams.product === "string" ? searchParams.product : undefined;
  const activeProducts = ["one-article"];
  const selectedProduct = product && activeProducts.includes(product) ? product : undefined;
  const runs = await prisma.operationalRun.findMany({
    where: selectedProduct ? { productKey: selectedProduct } : { productKey: { in: activeProducts } },
    orderBy: { startedAt: "desc" }, take: 200,
  });
  return <AdminShell title="Run history" subtitle="Cron, manual runs, outcomes and errors">
    <AdminCard title="Latest 200 runs"><AdminTable
      head={["Started", "Product", "Route", "Status", "Mode", "Generated", "Sent", "Skipped", "Failed", "Error"]}
      empty="No operational runs recorded yet."
      rows={runs.map((r) => [fmtDateTime(r.startedAt), r.productKey, <span key="route" className="font-mono text-[11px]">{r.route}</span>,
        <StatusBadge key="status" value={r.status} tone={r.status === "SUCCESS" ? "good" : r.status === "FAILED" ? "bad" : "neutral"} />,
        r.dryRun ? "Dry" : "Live", r.generatedCount, r.sentCount, r.skippedCount, r.failedCount, r.error ?? "—"])} />
    </AdminCard>
  </AdminShell>;
}
