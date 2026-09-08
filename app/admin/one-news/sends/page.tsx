import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  AdminFilterBar,
  AdminFilterField,
  adminControlClass,
  adminFilterButtonClass,
  adminResetClass,
} from "@/components/admin/AdminFilters";
import { oneNewsTabs } from "@/lib/admin/one-news-nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime, maskEmail } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/one-news/sends — the OneNews counterpart of the OneArticle delivery
 * history. Same columns and the same separation of OneRead's logical state
 * from the provider outcome, because an operator comparing the two products
 * should not have to learn two vocabularies.
 */
export default async function OneNewsSendsPage(props: {
  searchParams: Promise<{ status?: string; providerStatus?: string; email?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-news/sends", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const where: Prisma.OneNewsDeliveryWhereInput = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.providerStatus) where.providerStatus = searchParams.providerStatus;
  if (searchParams.email) where.contact = { email: { contains: searchParams.email, mode: "insensitive" } };

  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const pageSize = 50;
  const [deliveries, total] = await Promise.all([
    prisma.oneNewsDelivery.findMany({
      where,
      include: {
        contact: { select: { email: true } },
        issue: { select: { id: true, headline: true, readingLanguage: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.oneNewsDelivery.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AdminShell
      title="Delivery history"
      subtitle={`${total} recipient record(s) · page ${page} of ${pages}`}
    >
      <AdminTabs tabs={oneNewsTabs()} active="sends" />
      <AdminFilterBar method="get">
        <AdminFilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ""} className={adminControlClass}>
            <option value="">All statuses</option>
            {["QUEUED", "SENDING", "SENT", "FAILED", "SKIPPED", "RECONCILIATION_REQUIRED"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Provider outcome">
          <select name="providerStatus" defaultValue={searchParams.providerStatus ?? ""} className={adminControlClass}>
            <option value="">All outcomes</option>
            {["ACCEPTED", "DELIVERED", "DELAYED", "FAILED", "BOUNCED", "COMPLAINED"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Email">
          <input name="email" defaultValue={searchParams.email ?? ""} className={`${adminControlClass} w-60`} placeholder="reader@example.com" />
        </AdminFilterField>
        <button className={adminFilterButtonClass}>Apply filters</button>
        <Link href="/admin/one-news/sends" className={adminResetClass}>Reset</Link>
      </AdminFilterBar>
      <AdminCard>
        <AdminTable
          head={["Updated", "Recipient", "Brief", "Language", "OneRead state", "Provider outcome", "Attempts", "Accepted", "Provider update", "Reason"]}
          empty="No OneNews delivery records match."
          rows={deliveries.map((delivery) => [
            fmtDateTime(delivery.updatedAt),
            maskEmail(delivery.contact.email),
            <Link key="i" href={`/admin/one-news/issues/${delivery.issue.id}`} className="text-admin-ink underline underline-offset-2">
              {delivery.issue.headline}
            </Link>,
            delivery.issue.readingLanguage,
            <StatusBadge key="s" value={delivery.status} />,
            <StatusBadge key="p" value={delivery.providerStatus ?? (delivery.providerAcceptedAt ? "ACCEPTED" : "PENDING")} />,
            delivery.attemptCount,
            fmtDateTime(delivery.providerAcceptedAt),
            fmtDateTime(delivery.providerStatusAt),
            <span key="r" className="text-[11.5px] text-rose-700">
              {delivery.failedReason ?? delivery.skippedReason ?? "—"}
            </span>,
          ])}
        />
      </AdminCard>
      <AdminPagination
        page={page}
        pages={pages}
        basePath="/admin/one-news/sends"
        params={{
          status: searchParams.status,
          providerStatus: searchParams.providerStatus,
          email: searchParams.email,
        }}
      />
    </AdminShell>
  );
}
