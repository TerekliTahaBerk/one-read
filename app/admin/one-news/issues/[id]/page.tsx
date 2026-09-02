import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { OneNewsIssueEditor } from "@/components/admin/OneNewsIssueEditor";
import { oneNewsTabs } from "@/lib/admin/one-news-nav";
import { prisma } from "@/lib/prisma";
import { OneNewsDeliveryActions } from "@/components/admin/OneNewsDeliveryActions";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsIssuePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const guard = await guardAdminPage(`/admin/one-news/issues/${id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const issue = await prisma.oneNewsIssue.findUnique({
    where: { id },
    include: {
      sources: { orderBy: { sortOrder: "asc" } },
      corrections: { orderBy: { createdAt: "asc" } },
      deliveries: { orderBy: { updatedAt: "desc" }, take: 50 },
    },
  });
  if (!issue) notFound();
  const logical = (status: string) => issue.deliveries.filter((row) => row.status === status).length;
  const provider = (status: string) => issue.deliveries.filter((row) => row.providerStatus === status).length;
  const failed = logical("FAILED");
  const ambiguous = logical("RECONCILIATION_REQUIRED");

  return (
    <AdminShell
      title={issue.headline || "Untitled draft"}
      subtitle={`${issue.readingLanguage} · version ${issue.version} · last edited by ${issue.updatedBy}`}
      actions={<StatusBadge value={issue.status} />}
    >
      <AdminTabs tabs={oneNewsTabs()} active="issues" />
      <AdminCard title="Delivery operations" subtitle="Accepted is not mailbox-delivered. Recent rows are bounded to 50 on this detail view.">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><strong>{logical("SENT")}</strong><br />Accepted</div>
          <div><strong>{provider("DELIVERED")}</strong><br />Delivered</div>
          <div><strong>{failed}</strong><br />Failed</div>
          <div><strong>{ambiguous}</strong><br />Ambiguous</div>
        </div>
        <div className="mt-4"><OneNewsDeliveryActions issueId={issue.id} failed={failed} ambiguous={ambiguous} /></div>
        {issue.deliveries.map((delivery) => <div key={delivery.id} className="mt-3 rounded-lg border p-3 text-xs">
          <div>{delivery.status} · provider {delivery.providerStatus ?? "pending"} · attempts {delivery.attemptCount}</div>
          <div className="mt-1 text-admin-muted">Last attempt {fmtDateTime(delivery.lastAttemptAt)}{delivery.failedReason ? ` · ${delivery.failedReason}` : ""}</div>
        </div>)}
      </AdminCard>
      <AdminCard
        title="Editorial content"
        subtitle="The preview below is the exact renderer production OneNews delivery uses."
        bodyClassName="p-4"
        containerClassName="overflow-visible"
      >
        <OneNewsIssueEditor
          issue={{
            id: issue.id,
            version: issue.version,
            status: issue.status,
            readingLanguage: issue.readingLanguage,
            timezone: issue.timezone,
            subject: issue.subject,
            previewText: issue.previewText,
            headline: issue.headline,
            dek: issue.dek,
            whatHappened: issue.whatHappened,
            whyItMatters: issue.whyItMatters,
            whatsContested: issue.whatsContested,
            whatToWatch: issue.whatToWatch,
            developing: issue.developing,
            asOf: issue.asOf?.toISOString() ?? null,
            adminNotes: issue.adminNotes,
            scheduledFor: issue.scheduledFor?.toISOString() ?? null,
            sources: issue.sources.map((source) => ({
              url: source.url,
              title: source.title,
              publication: source.publication,
              sourceType: source.sourceType,
              publishedAt: source.publishedAt?.toISOString() ?? null,
              accessedAt: source.accessedAt?.toISOString() ?? null,
              note: source.note,
              sortOrder: source.sortOrder,
            })),
            corrections: issue.corrections.map((correction) => ({
              id: correction.id,
              type: correction.type,
              note: correction.note,
              createdBy: correction.createdBy,
              createdAt: correction.createdAt.toISOString(),
              versionBefore: correction.versionBefore,
              versionAfter: correction.versionAfter,
              correctionEmailRecommended: correction.correctionEmailRecommended,
              correctionEmailDecision: correction.correctionEmailDecision,
            })),
          }}
        />
      </AdminCard>
    </AdminShell>
  );
}
