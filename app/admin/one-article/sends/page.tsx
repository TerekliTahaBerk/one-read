import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneArticleTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditorialSendsPage({
  searchParams,
}: {
  searchParams: { status?: string; email?: string };
}) {
  const guard = guardAdminPage("/admin/one-article/sends", searchParams);
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
    <AdminShell title="Sends" subtitle={`${deliveries.length} most recent editorial delivery records`}>
      <AdminTabs tabs={oneArticleTabs()} active="sends" />
      <form className="mb-5 flex flex-wrap items-end gap-3 text-[12.5px]">
        <label><span className="mb-1 block text-[10px] uppercase tracking-eyebrow text-admin-muted">Status</span><select name="status" defaultValue={searchParams.status ?? ""} className={filter}><option value="">All</option>{["QUEUED", "SENDING", "SENT", "FAILED", "SKIPPED"].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label><span className="mb-1 block text-[10px] uppercase tracking-eyebrow text-admin-muted">Email</span><input name="email" defaultValue={searchParams.email ?? ""} className={filter} /></label>
        <button className={filter}>Apply</button><Link href="/admin/one-article/sends" className="px-2 py-2 text-admin-muted">Reset</Link>
      </form>
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

const filter = "rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-admin-ink";
