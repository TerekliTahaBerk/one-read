import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  AdminFilterBar,
  AdminFilterField,
  adminControlClass,
  adminFilterButtonClass,
  adminResetClass,
} from "@/components/admin/AdminFilters";
import { oneArticleTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditorialSendsPage(
  props: {
    searchParams: Promise<{ status?: string; email?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-article/sends", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const where: Prisma.OneArticleDeliveryWhereInput = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.email) where.contact = { email: { contains: searchParams.email, mode: "insensitive" } };
  const deliveries = await prisma.oneArticleDelivery.findMany({
    where,
    include: {
      contact: { select: { email: true } },
      issue: { select: { id: true, headline: true, readingLanguage: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
  return (
    <AdminShell title="Deliveries" subtitle={`${deliveries.length} most recent recipient delivery records`}>
      <AdminTabs tabs={oneArticleTabs()} active="sends" />
      <AdminFilterBar method="get">
        <AdminFilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ""} className={adminControlClass}><option value="">All statuses</option>{["QUEUED", "SENDING", "SENT", "FAILED", "SKIPPED"].map((status) => <option key={status}>{status}</option>)}</select>
        </AdminFilterField>
        <AdminFilterField label="Email">
          <input name="email" defaultValue={searchParams.email ?? ""} className={`${adminControlClass} w-60`} placeholder="reader@example.com" />
        </AdminFilterField>
        <button className={adminFilterButtonClass}>Apply filters</button>
        <Link href="/admin/one-article/sends" className={adminResetClass}>Reset</Link>
      </AdminFilterBar>
      <AdminCard>
        <AdminTable
          head={["Updated", "Email", "Edition", "Language", "Status", "Attempts", "Sent", "Message ID", "Reason"]}
          empty="No editorial delivery records match."
          rows={deliveries.map((delivery) => [
            fmtDateTime(delivery.updatedAt),
            delivery.contact.email,
            <Link key="i" href={`/admin/one-article/issues/${delivery.issue.id}`} className="text-admin-ink underline underline-offset-2">{delivery.issue.headline}</Link>,
            delivery.issue.readingLanguage,
            <StatusBadge key="s" value={delivery.status} />,
            delivery.attemptCount,
            fmtDateTime(delivery.sentAt),
            <MonoShort key="m" value={delivery.providerMessageId} />,
            <span key="r" className="text-[11.5px] text-rose-700">{delivery.failedReason ?? delivery.skippedReason ?? "—"}</span>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
