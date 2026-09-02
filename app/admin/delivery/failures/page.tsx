import Link from "next/link";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime, maskEmail } from "@/lib/admin/format";
import { describeDeliveryFailure } from "@/lib/admin/delivery-recovery";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * /admin/delivery/failures — the recovery workbench.
 *
 * Every row states plainly what happened and which recovery path (if any) is
 * safe. Recovery itself stays on the edition screen behind an explicit
 * confirmation: there is deliberately no bulk resend anywhere in the admin,
 * because a resend of an ambiguous send can duplicate real mail.
 */
export default async function DeliveryFailuresPage() {
  const guard = await guardAdminPage("/admin/delivery/failures");
  if (!guard.ok) return <AdminNotConfigured />;

  const rows = await prisma.oneArticleDelivery.findMany({
    where: {
      OR: [
        { status: { in: ["FAILED", "RECONCILIATION_REQUIRED"] } },
        { providerStatus: { in: ["DELAYED", "FAILED", "BOUNCED", "COMPLAINED"] } },
      ],
    },
    include: {
      contact: { select: { email: true } },
      issue: { select: { id: true, headline: true } },
      productSubscription: { select: { emailDeliveryStatus: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <AdminShell
      title="Failure &amp; recovery"
      subtitle="What happened, and which recovery path is safe"
    >
      <AdminCard>
        <AdminTable
          head={[
            "When",
            "Recipient",
            "Edition",
            "OneRead state",
            "Provider",
            "Attempts",
            "Subscriber",
            "What happened",
            "Recovery",
          ]}
          empty="No delivery failures need attention."
          rows={rows.map((row) => {
            const verdict = describeDeliveryFailure(row);
            return [
              fmtDateTime(row.providerStatusAt ?? row.updatedAt),
              maskEmail(row.contact.email),
              <Link
                key="issue"
                href={`/admin/one-article/issues/${row.issue.id}`}
                className="text-admin-ink underline underline-offset-2"
              >
                {row.issue.headline}
              </Link>,
              <StatusBadge key="logical" value={row.status} />,
              <StatusBadge key="provider" value={row.providerStatus ?? "NO_EVENT"} />,
              row.attemptCount,
              `${row.productSubscription.status} · ${row.productSubscription.emailDeliveryStatus}`,
              verdict.what,
              <span key="recovery" className={verdict.safeToRetry ? undefined : "text-dawn"}>
                {verdict.recovery}
              </span>,
            ];
          })}
        />
      </AdminCard>
      <p className="font-sans text-[12px] leading-5 text-admin-muted">
        Ambiguous and provider-delayed mail is never resent automatically. Open
        the edition to use the guarded recovery action, which confirms before
        any send that could duplicate a message.
      </p>
    </AdminShell>
  );
}
