import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { prisma } from "@/lib/prisma";

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

  const [events, unprocessed] = await Promise.all([
    prisma.billingEvent.findMany({
      select: {
        providerEventId: true,
        provider: true,
        type: true,
        processedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.billingEvent.count({ where: { processedAt: null } }),
  ]);

  return (
    <AdminShell
      title="Webhooks"
      subtitle={
        unprocessed > 0
          ? `${unprocessed} event(s) received but not yet processed`
          : "All received billing events have been processed"
      }
    >
      <AdminCard title="Billing events" subtitle="100 most recent">
        <AdminTable
          head={["Received", "Provider", "Event", "Processed", "Event ID"]}
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
