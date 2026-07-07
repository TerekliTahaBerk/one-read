import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneArticleTabs } from "@/lib/admin/nav";
import { topicBySlug } from "@/lib/topics";
import { fmtDate, fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/one-article/sends — delivery log. Who got the email, who didn't, why. */
export default async function SendsPage({
  searchParams,
}: {
  searchParams: { date?: string; status?: string; email?: string };
}) {
  const guard = guardAdminPage("/admin/one-article/sends", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const where: Prisma.DailySendWhereInput = {};
  if (searchParams.date) where.date = new Date(searchParams.date + "T00:00:00Z");
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.email) {
    where.subscriber = { email: { contains: searchParams.email, mode: "insensitive" } };
  }

  const sends = await prisma.dailySend.findMany({
    where,
    include: { subscriber: { select: { email: true } }, pick: { select: { topic: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <AdminShell title="Sends" subtitle={`${sends.length} most recent send records`}>
      <AdminTabs tabs={oneArticleTabs()} active="sends" />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 text-[12.5px] font-sans">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Date</span>
          <input type="date" name="date" defaultValue={searchParams.date ?? ""} className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Status</span>
          <select name="status" defaultValue={searchParams.status ?? ""} className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink">
            <option value="">Any</option>
            {["QUEUED", "SENT", "SKIPPED", "FAILED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Email</span>
          <input type="text" name="email" defaultValue={searchParams.email ?? ""} placeholder="contains…" className="w-44 rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink" />
        </label>
        <button type="submit" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-admin-ink hover:bg-admin-sink">Apply</button>
        <Link href="/admin/one-article/sends" className="px-2 py-1.5 text-admin-muted hover:text-admin-ink">Reset</Link>
      </form>

      <AdminCard>
        <AdminTable
          head={["Date", "Email", "Status", "Topic", "Lang", "Score", "Sent at", "Message ID", "Reason / error"]}
          empty="No send records match these filters."
          rows={sends.map((s) => [
            <span key="d" className="text-admin-body">{fmtDate(s.date)}</span>,
            <span key="e" className="text-admin-ink">{s.subscriber.email}</span>,
            <StatusBadge key="s" value={s.status} />,
            topicBySlug(s.matchedTopic)?.label ?? s.matchedTopic,
            <span key="l" className="text-admin-body">{s.summaryLanguage}</span>,
            s.personalizedScore.toFixed(2),
            <span key="sa" className="text-admin-body">{fmtDateTime(s.sentAt)}</span>,
            <MonoShort key="m" value={s.emailMessageId} />,
            <span key="r" className="text-[11.5px] text-dawn">{s.error ?? "—"}</span>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
