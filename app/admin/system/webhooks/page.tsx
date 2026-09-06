import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { prisma } from "@/lib/prisma";
import { RECONCILIATION_OUTCOMES, needsReconciliation } from "@/lib/billing/polar";

/**
 * Plain-English rendering of a stored outcome. The admin panel never shows raw
 * enum values — an operator should read what happened, not decode a symbol.
 */
function describeOutcome(outcome: string | null): string {
  switch (outcome) {
    case "applied":
      return "Applied to the subscription";
    case "noop":
      return "Nothing to change";
    case "ignored_event_type":
      return "Not a billing event we act on";
    case "ignored_stale":
      return "Older than what we already had";
    case "unrecognized_product":
      return "Unknown product — needs a look";
    case "no_subscription":
      return "No matching subscriber — needs a look";
    default:
      return outcome ? "Recorded" : "—";
  }
}

export const dynamic = "force-dynamic";

/**
 * /admin/system/webhooks — billing event processing state.
 *
 * Only safe metadata is selected: event type, timing, and provider IDs. Raw
 * webhook payloads carry customer and billing data and are never rendered.
 */
export default async function SystemWebhooksPage() {
  const guard = await guardAdminPage("/admin/system/webhooks");
  if (!guard.ok) return <AdminNotConfigured />;

  const [events, unprocessed, unmatched] = await Promise.all([
    prisma.billingEvent.findMany({
      select: {
        providerEventId: true,
        provider: true,
        type: true,
        processedAt: true,
        outcome: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.billingEvent.count({ where: { processedAt: null } }),
    // Events we handled but could not fully act on. Nothing is retried for
    // these — a retry reaches the same answer — so they need a person.
    prisma.billingEvent.count({
      where: { outcome: { in: [...RECONCILIATION_OUTCOMES] } },
    }),
  ]);

  return (
    <AdminShell
      title="Webhooks"
      subtitle={
        unprocessed > 0
          ? `${unprocessed} event(s) received but not yet processed`
          : unmatched > 0
            ? `${unmatched} event(s) handled safely but never matched a subscriber`
            : "All received billing events have been processed"
      }
    >
      <AdminCard title="Billing events" subtitle="100 most recent">
        <AdminTable
          head={["Received", "Provider", "Event", "Processed", "What happened", "Event ID"]}
          empty="No billing events recorded."
          rows={events.map((event) => [
            fmtDateTime(event.createdAt),
            event.provider,
            event.type,
            event.processedAt ? (
              fmtDateTime(event.processedAt)
            ) : (
              <span key="pending" className="text-dawn">
                Needs attention
              </span>
            ),
            needsReconciliation(event.outcome) ? (
              <span key="outcome" className="text-dawn">
                {describeOutcome(event.outcome)}
              </span>
            ) : (
              describeOutcome(event.outcome)
            ),
            <MonoShort key="id" value={event.providerEventId} />,
          ])}
        />
      </AdminCard>
      <p className="font-sans text-[12px] leading-5 text-admin-muted">
        Raw webhook bodies are intentionally not displayed. Polar remains the
        source of truth for billing detail.
      </p>
    </AdminShell>
  );
}
