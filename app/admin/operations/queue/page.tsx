import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { OperatorQueueAction } from "@/components/admin/OperatorQueueAction";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtAgo } from "@/lib/admin/format";
import { loadOperatorQueue } from "@/lib/admin/operator-queue";

export const dynamic = "force-dynamic";
const FILTERS = [
  ["all", "All"], ["delivery-retryable", "Hard failed"], ["delivery-reconciliation", "Ambiguous"],
  ["provider-unresolved", "Provider unresolved"], ["billing-reconciliation", "Billing"], ["cron-failed", "Cron failed"],
] as const;

export default async function OperatorQueuePage({ searchParams }: { searchParams?: Promise<{ category?: string }> }) {
  const params = await searchParams ?? {};
  const guard = await guardAdminPage("/admin/operations/queue", params);
  if (!guard.ok) return <AdminNotConfigured />;
  const category = typeof params.category === "string" ? params.category : "all";
  const items = await loadOperatorQueue(category);
  return <AdminShell title="Operator queue" subtitle="Unresolved delivery, billing, and cron work — one production-safe surface">
    <div className="flex flex-wrap gap-2">{FILTERS.map(([key, label]) => <a key={key} href={`?category=${key}`} className={`rounded-full border px-3 py-1 text-xs ${category === key ? "border-admin-ink bg-admin-ink text-white" : "border-admin-line-strong"}`}>{label}</a>)}</div>
    <AdminCard>
      <AdminTable head={["Subsystem", "Product", "Age", "Reason", "Current state", "Safe correlation", "Allowed next action"]} empty="No unresolved items match this filter." rows={items.map((item) => [
        item.subsystem, item.product, fmtAgo(item.occurredAt), item.reason, item.state, <code key="correlation">{item.correlation}</code>,
        <div key="action" className="space-y-2"><div>{item.nextAction}</div>{item.action && <OperatorQueueAction product={item.action.product} deliveryId={item.action.deliveryId} />}</div>,
      ])} />
    </AdminCard>
    <p className="text-xs leading-5 text-admin-muted">No email address or raw provider payload is displayed. Ambiguous and provider-accepted sends can only be reconciled with provider evidence; this queue never resends them.</p>
  </AdminShell>;
}
