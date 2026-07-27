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
import { oneFilmTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FilmSends(
  props: { searchParams: Promise<{ status?: string; email?: string }> },
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-film/sends", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const where: Prisma.OneFilmDeliveryWhereInput = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.email) {
    where.contact = { email: { contains: searchParams.email, mode: "insensitive" } };
  }
  const rows = await prisma.oneFilmDelivery.findMany({
    where,
    include: {
      contact: { select: { email: true } },
      issue: { select: { id: true, filmTitle: true, emailLanguage: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return (
    <AdminShell title="Film deliveries" subtitle={`${rows.length} recent recipient records`}>
      <AdminTabs tabs={oneFilmTabs()} active="sends" />
      <AdminFilterBar method="get">
        <AdminFilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ""} className={adminControlClass}>
            <option value="">All statuses</option>
            {["QUEUED", "SENDING", "SENT", "FAILED", "SKIPPED"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Email">
          <input
            name="email"
            defaultValue={searchParams.email ?? ""}
            className={`${adminControlClass} w-60`}
            placeholder="reader@example.com"
          />
        </AdminFilterField>
        <button className={adminFilterButtonClass}>Apply filters</button>
        <Link href="/admin/one-film/sends" className={adminResetClass}>Reset</Link>
      </AdminFilterBar>
      <AdminCard>
        <AdminTable
          head={["Updated", "Email", "Film", "Language", "Status", "Attempts", "Sent", "Message ID", "Reason"]}
          empty="No deliveries match."
          rows={rows.map((delivery) => [
            fmtDateTime(delivery.updatedAt),
            delivery.contact.email,
            <Link key="issue" href={`/admin/one-film/issues/${delivery.issue.id}`} className="text-admin-ink underline underline-offset-2">
              {delivery.issue.filmTitle}
            </Link>,
            delivery.issue.emailLanguage,
            <StatusBadge key="status" value={delivery.status} />,
            delivery.attemptCount,
            fmtDateTime(delivery.sentAt),
            <MonoShort key="message" value={delivery.providerMessageId} />,
            delivery.failedReason ?? delivery.skippedReason ?? "—",
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
