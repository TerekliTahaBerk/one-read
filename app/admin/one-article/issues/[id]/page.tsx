import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EditorialIssueEditor } from "@/components/admin/EditorialIssueEditor";
import { prisma } from "@/lib/prisma";
import { countEligibleEditorialRecipients } from "@/lib/one-article/editorial";
import { fmtDateTime } from "@/lib/admin/format";
import { SUMMARY_LANGUAGES } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditorialIssueDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage(`/admin/one-article/issues/${params.id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const issue = await prisma.oneArticleIssue.findUnique({
    where: { id: params.id },
    include: {
      deliveries: {
        include: { contact: { select: { email: true } } },
        orderBy: { updatedAt: "desc" },
        take: 200,
      },
    },
  });
  if (!issue) notFound();
  const [audienceRows, deliveryCounts] = await Promise.all([
    Promise.all(
      SUMMARY_LANGUAGES.map(async (language) => [
        language,
        await countEligibleEditorialRecipients(language),
      ] as const),
    ),
    prisma.oneArticleDelivery.groupBy({
      by: ["status"],
      where: { issueId: issue.id },
      _count: { _all: true },
    }),
  ]);
  const audienceByLanguage = Object.fromEntries(audienceRows);
  const eligible = audienceByLanguage[issue.readingLanguage] ?? 0;
  const deliveryCount = (status: string) =>
    deliveryCounts.find((row) => row.status === status)?._count._all ?? 0;
  const sent = deliveryCount("SENT");
  const failed = deliveryCount("FAILED");
  const skipped = deliveryCount("SKIPPED");
  return (
    <AdminShell
      title={issue.headline || "Untitled edition"}
      subtitle={`${issue.readingLanguage} · ${issue.status}`}
      actions={<Link href="/admin/one-article/issues" className="text-[13px] text-admin-body">← All editions</Link>}
    >
      <AdminCard title="Readiness and delivery" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Status" value={issue.status} />
          <MetricCard label="Eligible now" value={eligible} tone={eligible > 0 ? "good" : "warn"} />
          <MetricCard label="Delivered" value={sent} tone="good" />
          <MetricCard label="Failed" value={failed} tone={failed > 0 ? "warn" : "default"} />
          <MetricCard label="Skipped" value={skipped} />
          <MetricCard label="Scheduled" value={fmtDateTime(issue.scheduledFor)} />
        </MetricGrid>
      </AdminCard>
      <AdminCard title="Editor" subtitle={`Version ${issue.version} · updated ${fmtDateTime(issue.updatedAt)}`} bodyClassName="p-4" containerClassName="overflow-visible">
        <EditorialIssueEditor audienceByLanguage={audienceByLanguage} issue={{
          id: issue.id,
          version: issue.version,
          status: issue.status,
          readingLanguage: issue.readingLanguage,
          subject: issue.subject,
          previewText: issue.previewText,
          headline: issue.headline,
          bodyText: issue.bodyText,
          sourceTitle: issue.sourceTitle,
          sourceName: issue.sourceName,
          sourceUrl: issue.sourceUrl,
          ctaLabel: issue.ctaLabel,
          adminNotes: issue.adminNotes,
          scheduledFor: issue.scheduledFor?.toISOString() ?? null,
        }} />
      </AdminCard>
      <AdminCard title="Deliveries" subtitle="Latest 200 recipient records">
        <AdminTable
          head={["Email", "Status", "Attempts", "Last attempt", "Sent", "Message ID", "Reason"]}
          empty="No delivery records yet. They are created when cron dispatches this edition."
          rows={issue.deliveries.map((delivery) => [
            delivery.contact.email,
            <StatusBadge key="s" value={delivery.status} />,
            delivery.attemptCount,
            fmtDateTime(delivery.lastAttemptAt),
            fmtDateTime(delivery.sentAt),
            <MonoShort key="m" value={delivery.providerMessageId} />,
            <span key="r" className="text-[11.5px] text-rose-700">{delivery.failedReason ?? delivery.skippedReason ?? "—"}</span>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
