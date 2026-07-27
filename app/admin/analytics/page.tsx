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

export default async function AnalyticsPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/analytics", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [
    deliveryGroups,
    sentByLanguageRows,
    editionGroups,
    recentProblems,
    filmDeliveryGroups,
    filmEditionGroups,
    recentFilmProblems,
    subscriptionGroups,
    contactCount,
    articlePreferencesCount,
    filmPreferencesCount,
    billingEventCount,
  ] =
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
      prisma.oneFilmDelivery.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.oneFilmIssue.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.oneFilmDelivery.findMany({
        where: { status: { in: ["FAILED", "SKIPPED"] } },
        include: {
          contact: { select: { email: true } },
          issue: { select: { id: true, filmTitle: true, emailLanguage: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      prisma.productSubscription.groupBy({
        by: ["status"],
        where: { productKey: "one-read" },
        _count: { _all: true },
      }),
      prisma.contact.count(),
      prisma.articlePreferences.count(),
      prisma.filmPreferences.count(),
      prisma.billingEvent.count({ where: { processedAt: { not: null } } }),
    ]);

  const deliveries = Object.fromEntries(
    deliveryGroups.map((row) => [row.status, row._count._all]),
  );
  const editions = Object.fromEntries(
    editionGroups.map((row) => [row.status, row._count._all]),
  );
  const filmDeliveries = Object.fromEntries(
    filmDeliveryGroups.map((row) => [row.status, row._count._all]),
  );
  const filmEditions = Object.fromEntries(
    filmEditionGroups.map((row) => [row.status, row._count._all]),
  );
  const subscriptions = Object.fromEntries(
    subscriptionGroups.map((row) => [row.status, row._count._all]),
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
      <AdminCard title="Acquisition and activation" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Contacts" value={contactCount} />
          <MetricCard label="Article preferences" value={articlePreferencesCount} />
          <MetricCard label="Film preferences" value={filmPreferencesCount} />
          <MetricCard label="Awaiting checkout" value={subscriptions.PENDING_CHECKOUT ?? 0} />
          <MetricCard
            label="Active paid"
            value={(subscriptions.ACTIVE_PAID ?? 0) + (subscriptions.TRIALING ?? 0)}
            tone="good"
          />
          <MetricCard label="Processed billing events" value={billingEventCount} />
        </MetricGrid>
      </AdminCard>

      <AdminCard title="OneArticle delivery outcomes" bodyClassName="p-4">
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

      <AdminCard title="OneArticle editorial flow" bodyClassName="p-4">
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

      <AdminCard title="OneFilm delivery outcomes" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Delivered" value={filmDeliveries.SENT ?? 0} tone="good" />
          <MetricCard label="Failed" value={filmDeliveries.FAILED ?? 0} tone={filmDeliveries.FAILED ? "warn" : "default"} />
          <MetricCard label="Skipped" value={filmDeliveries.SKIPPED ?? 0} />
          <MetricCard label="Queued" value={filmDeliveries.QUEUED ?? 0} />
          <MetricCard label="Sending" value={filmDeliveries.SENDING ?? 0} />
        </MetricGrid>
      </AdminCard>

      <AdminCard title="OneFilm editorial flow" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Drafts" value={filmEditions.DRAFT ?? 0} />
          <MetricCard label="Ready" value={filmEditions.READY ?? 0} />
          <MetricCard label="Scheduled" value={filmEditions.SCHEDULED ?? 0} tone="good" />
          <MetricCard label="Sent editions" value={filmEditions.SENT ?? 0} tone="good" />
          <MetricCard
            label="Editions with failures"
            value={(filmEditions.FAILED ?? 0) + (filmEditions.PARTIALLY_FAILED ?? 0)}
            tone={filmEditions.FAILED || filmEditions.PARTIALLY_FAILED ? "warn" : "default"}
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

      <AdminCard title="Recent OneFilm exceptions" subtitle="Latest 50 failed or skipped recipients">
        <AdminTable
          head={["Updated", "Reader", "Edition", "Language", "Status", "Reason"]}
          empty="No failed or skipped OneFilm deliveries."
          rows={recentFilmProblems.map((delivery) => [
            fmtDateTime(delivery.updatedAt),
            delivery.contact.email,
            <Link
              key="edition"
              href={`/admin/one-film/issues/${delivery.issue.id}`}
              className="text-admin-ink underline underline-offset-2"
            >
              {delivery.issue.filmTitle || "Untitled edition"}
            </Link>,
            delivery.issue.emailLanguage,
            <StatusBadge key="status" value={delivery.status} />,
            delivery.failedReason ?? delivery.skippedReason ?? "—",
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
