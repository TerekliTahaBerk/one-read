import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";
import { SUMMARY_LANGUAGES } from "@/lib/options";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/analytics", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [deliveryGroups, sentByLanguageRows, editionGroups, recentProblems] =
    await Promise.all([
      prisma.oneArticleDelivery.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.oneArticleDelivery.findMany({
        where: { status: "SENT" },
        select: { issue: { select: { readingLanguage: true } } },
      }),
      prisma.oneArticleIssue.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.oneArticleDelivery.findMany({
        where: { status: { in: ["FAILED", "SKIPPED"] } },
        include: {
          contact: { select: { email: true } },
          issue: { select: { id: true, headline: true, readingLanguage: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
    ]);

  const deliveries = Object.fromEntries(
    deliveryGroups.map((row) => [row.status, row._count._all]),
  );
  const editions = Object.fromEntries(
    editionGroups.map((row) => [row.status, row._count._all]),
  );
  const sentByLanguage = Object.fromEntries(
    SUMMARY_LANGUAGES.map((language) => [
      language,
      sentByLanguageRows.filter((row) => row.issue.readingLanguage === language).length,
    ]),
  );

  return (
    <AdminShell
      title="Analytics"
      subtitle="Manual edition throughput and recipient delivery outcomes"
    >
      <AdminCard title="Delivery outcomes" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Delivered" value={deliveries.SENT ?? 0} tone="good" />
          <MetricCard
            label="Failed"
            value={deliveries.FAILED ?? 0}
            tone={deliveries.FAILED ? "warn" : "default"}
          />
          <MetricCard label="Skipped" value={deliveries.SKIPPED ?? 0} />
          <MetricCard label="Queued" value={deliveries.QUEUED ?? 0} />
          <MetricCard label="Sending" value={deliveries.SENDING ?? 0} />
        </MetricGrid>
      </AdminCard>

      <AdminCard title="Editorial flow" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Drafts" value={editions.DRAFT ?? 0} />
          <MetricCard label="Ready" value={editions.READY ?? 0} />
          <MetricCard label="Scheduled" value={editions.SCHEDULED ?? 0} tone="good" />
          <MetricCard label="Sent editions" value={editions.SENT ?? 0} tone="good" />
          <MetricCard
            label="Editions with failures"
            value={(editions.FAILED ?? 0) + (editions.PARTIALLY_FAILED ?? 0)}
            tone={editions.FAILED || editions.PARTIALLY_FAILED ? "warn" : "default"}
          />
        </MetricGrid>
      </AdminCard>

      <AdminCard title="Delivered by reading language" bodyClassName="p-4">
        <MetricGrid>
          {SUMMARY_LANGUAGES.map((language) => (
            <MetricCard
              key={language}
              label={language}
              value={sentByLanguage[language] ?? 0}
            />
          ))}
        </MetricGrid>
      </AdminCard>

      <AdminCard title="Recent delivery exceptions" subtitle="Latest 50 failed or skipped recipients">
        <AdminTable
          head={["Updated", "Reader", "Edition", "Language", "Status", "Reason"]}
          empty="No failed or skipped deliveries."
          rows={recentProblems.map((delivery) => [
            fmtDateTime(delivery.updatedAt),
            delivery.contact.email,
            <Link
              key="edition"
              href={`/admin/one-article/issues/${delivery.issue.id}`}
              className="text-admin-ink underline underline-offset-2"
            >
              {delivery.issue.headline || "Untitled edition"}
            </Link>,
            delivery.issue.readingLanguage,
            <StatusBadge key="status" value={delivery.status} />,
            delivery.failedReason ?? delivery.skippedReason ?? "—",
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
