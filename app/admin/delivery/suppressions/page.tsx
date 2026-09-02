import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime, maskEmail } from "@/lib/admin/format";
import { ONE_ARTICLE_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Why an address stopped receiving mail, and whether it can be resumed. */
function describeSuppression(status: string): { reason: string; resumable: string } {
  if (status === "UNSUBSCRIBED") {
    return {
      reason: "Reader unsubscribed",
      resumable: "Reader may resume email themselves",
    };
  }
  return {
    reason: "Bounce or complaint suppression",
    resumable: "Not resumable by the ordinary resume action",
  };
}

/**
 * /admin/delivery/suppressions — email delivery state only.
 *
 * The billing column exists to make one thing unmistakable: suppressing email
 * does not cancel a Polar subscription, and a suppressed reader may still be
 * paying. The two states are tracked and changed independently.
 */
export default async function DeliverySuppressionsPage() {
  const guard = await guardAdminPage("/admin/delivery/suppressions");
  if (!guard.ok) return <AdminNotConfigured />;

  const rows = await prisma.productSubscription.findMany({
    where: {
      productKey: ONE_ARTICLE_PRODUCT_KEY,
      emailDeliveryStatus: { in: ["UNSUBSCRIBED", "SUPPRESSED"] },
    },
    include: {
      contact: { select: { email: true } },
      _count: { select: { oneArticleDeliveries: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <AdminShell
      title="Suppressions"
      subtitle="Email delivery state is tracked separately from billing"
    >
      <AdminCard>
        <AdminTable
          head={[
            "Recipient",
            "Email state",
            "Reason",
            "Since",
            "Billing access",
            "Deliveries",
            "Can resume?",
          ]}
          empty="No suppressed or unsubscribed recipients."
          rows={rows.map((row) => {
            const detail = describeSuppression(row.emailDeliveryStatus);
            return [
              maskEmail(row.contact.email),
              <StatusBadge key="email" value={row.emailDeliveryStatus} />,
              detail.reason,
              fmtDateTime(row.updatedAt),
              <StatusBadge key="billing" value={row.status} />,
              row._count.oneArticleDeliveries,
              detail.resumable,
            ];
          })}
        />
      </AdminCard>
      <p className="font-sans text-[12px] leading-5 text-admin-muted">
        Suppression never cancels Polar billing, and cancelling billing never
        suppresses email. Bounce and complaint suppressions are deliberately not
        reversible through the ordinary “resume emails” action.
      </p>
    </AdminShell>
  );
}
