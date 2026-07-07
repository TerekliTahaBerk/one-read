import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { loadIssueDetail } from "@/lib/admin/issues-read";
import { IssueActionsBar } from "@/components/admin/IssueActionsBar";
import { OneArticleIssueEditor } from "@/components/admin/OneArticleIssueEditor";
import { topicBySlug } from "@/lib/topics";
import { fmtDate, fmtDateTime } from "@/lib/admin/format";
import { loadAuditLogs, summarizeAuditMetadata } from "@/lib/admin/audit";
import { getOneArticleIssueReadiness } from "@/lib/admin/one-article-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/one-article/issues/[id] — issue metadata, email preview, recipients. */
export default async function IssueDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage(`/admin/one-article/issues/${params.id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const detail = await loadIssueDetail(params.id);
  if (!detail) notFound();
  const { pick, previews, recipients } = detail;
  const [auditEvents, readiness] = await Promise.all([
    loadAuditLogs({ targetType: "TopicDailyPick", q: pick.id }, 20),
    getOneArticleIssueReadiness({ pickId: pick.id }),
  ]);
  const editablePreview = previews[0] ?? null;

  return (
    <AdminShell
      title={topicBySlug(pick.topic)?.label ?? pick.topic}
      subtitle={`${fmtDate(pick.date)} · ${pick.sourceLanguage} source`}
      actions={
        <Link href={`/admin/one-article/issues?date=${fmtDate(pick.date)}`} className="text-[13px] text-admin-body hover:text-admin-ink">
          ← All issues
        </Link>
      }
    >
      <AdminCard title="Actions" bodyClassName="p-4">
        <IssueActionsBar
          pickId={pick.id}
          dateIso={fmtDate(pick.date)}
          approvalStatus={pick.approvalStatus}
          eligibleCount={detail.eligibleCount}
          segmentLabel={`${topicBySlug(pick.topic)?.label ?? pick.topic} · ${pick.sourceLanguage}`}
          defaultTestEmail="tterekli9@gmail.com"
        />
      </AdminCard>

      <AdminCard title="Readiness" subtitle={readiness.status} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Eligible subscribers" value={readiness.eligibleCount} tone={readiness.eligibleCount > 0 ? "good" : "warn"} />
          <MetricCard label="Generated content" value={readiness.generatedContentExists ? "Yes" : "No"} tone={readiness.generatedContentExists ? "good" : "warn"} />
          <MetricCard label="Approved" value={readiness.approved ? "Yes" : "No"} tone={readiness.approved ? "good" : "warn"} />
          <MetricCard label="Scheduled" value={readiness.scheduled ? "Yes" : "No"} tone={readiness.scheduled ? "good" : "default"} />
        </MetricGrid>
        {[...readiness.blockers, ...readiness.warnings].length > 0 ? (
          <ul className="space-y-1 text-[12.5px] text-admin-body font-sans">
            {[...readiness.blockers, ...readiness.warnings].map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[12.5px] text-emerald-700 font-sans">Ready for scheduled send.</p>
        )}
      </AdminCard>

      <AdminCard title="Issue" bodyClassName="">
        <DefList
          rows={[
            ["Date", fmtDate(pick.date)],
            ["Topic", topicBySlug(pick.topic)?.label ?? pick.topic],
            ["Source language", pick.sourceLanguage],
            ["Article", pick.articleTitle],
            ["Source", pick.sourceName],
            [
              "Article URL",
              pick.article?.url ? (
                <a key="u" href={pick.article.url} target="_blank" rel="noopener noreferrer" className="text-admin-ink underline underline-offset-2 break-all">
                  {pick.article.url}
                </a>
              ) : (
                <span key="u" className="text-amber-700">No source article linked</span>
              ),
            ],
            ["Score", pick.score.toFixed(2)],
            ["Editorial status", <StatusBadge key="s" value={pick.status} />],
            ["Approval status", <StatusBadge key="ap" value={pick.approvalStatus} />],
            ["Scheduled for", fmtDateTime(pick.scheduledFor)],
            ["Approved at", fmtDateTime(pick.approvedAt)],
            ["Approved by", pick.approvedBy ?? "—"],
            ["Admin notes", pick.adminNotes ?? "—"],
            ["Reason for selection", pick.reasonForSelection ?? "—"],
          ]}
        />
      </AdminCard>

      {editablePreview && (
        <AdminCard title="Manual edit" subtitle="Overrides generated content; does not send" bodyClassName="p-4">
          <OneArticleIssueEditor
            pickId={pick.id}
            summaryId={editablePreview.summaryId}
            initialSubject={editablePreview.subjectOverride ?? editablePreview.subject}
            initialPreviewText={editablePreview.previewTextOverride ?? editablePreview.previewText}
            initialBodyText={editablePreview.bodyTextOverride ?? editablePreview.bodyText}
            initialAdminNotes={pick.adminNotes ?? ""}
          />
        </AdminCard>
      )}

      <AdminCard title="Recipients" subtitle="Calculated from ProductSubscription eligibility" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Matching" value={detail.matchingCount} />
          <MetricCard label="Eligible" value={detail.eligibleCount} tone="good" />
          <MetricCard label="Skipped" value={detail.skippedCount} />
          <MetricCard label="Already sent" value={detail.alreadySentCount} />
        </MetricGrid>
        <AdminTable
          head={["Email", "Eligibility", "Language", "Interests", "Already sent"]}
          empty="No eligible recipients match this segment right now."
          rows={recipients.map((r) => [
            <Link key="e" href={`/admin/users/${r.subscriptionId}`} className="text-admin-ink underline underline-offset-2">
              {r.email}
            </Link>,
            <EligibilityBadge key="el" allowed={r.eligible} reason={r.reason} />,
            <span key="l" className="text-admin-body">{r.summaryLanguage ?? "—"}</span>,
            <span key="i" className="text-admin-body">{r.interestsCount}</span>,
            r.alreadySent ? <StatusBadge key="s" value="SENT" /> : <span key="s" className="text-admin-muted">—</span>,
          ])}
        />
      </AdminCard>

      <AdminCard title="Email preview" subtitle={`${previews.length} Summary row(s) · rendering only, no send`}>
        {previews.length === 0 ? (
          <div className="px-4 py-8 text-[13px] text-admin-muted">
            No summary generated for this issue yet.
          </div>
        ) : (
          <div className="divide-y divide-admin-line">
            {previews.map((p) => (
              <div key={p.summaryId} className="p-4">
                <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12.5px]">
                  <span className="font-serif text-admin-ink text-[15px]">{p.subject}</span>
                  <span className="text-admin-muted">{p.summaryLanguage}</span>
                  <StatusBadge value={p.status} />
                  <span className="text-admin-body">confidence {p.confidence ?? "—"}</span>
                  <span className="font-mono text-[11px] text-admin-body">{p.generator ?? "—"}</span>
                  {(p.subjectOverride || p.previewTextOverride) && (
                    <span className="text-[10px] uppercase tracking-eyebrow text-amber-700">admin-edited</span>
                  )}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-admin-line text-[10px] uppercase tracking-eyebrow text-admin-muted">
                    render-only · not sent
                  </span>
                </div>
                <div className="mb-2 text-[11.5px] text-admin-body font-sans">
                  Generation: provider/model/prompt ·{" "}
                  <span className="font-mono">{p.generator ?? "—"}</span> · validation{" "}
                  <span className={p.status === "READY" ? "text-emerald-700" : "text-amber-700"}>
                    {p.status === "READY" ? "VALID" : p.status}
                  </span>
                </div>
                {p.rejectionReason && (
                  <div className="mb-2 text-[12px] text-rose-700 font-sans">
                    Rejection: {p.rejectionReason}
                  </div>
                )}
                {p.editorNotes && (
                  <details className="mb-2">
                    <summary className="cursor-pointer text-[11.5px] text-admin-muted font-sans">
                      Editor / quality-gate notes
                    </summary>
                    <pre className="mt-1 p-2 bg-admin-surface/70 rounded-lg border border-admin-line text-[11px] text-admin-ink/80 whitespace-pre-wrap font-mono">
                      {p.editorNotes}
                    </pre>
                  </details>
                )}
                {p.previewText && (
                  <div className="mb-2 text-[12px] text-admin-muted font-sans">Preview text: {p.previewText}</div>
                )}
                <iframe
                  title={`email-${p.summaryId}`}
                  srcDoc={p.html}
                  sandbox=""
                  className="w-full h-[460px] rounded-lg border border-admin-line bg-white"
                />
                <details className="mt-2">
                  <summary className="cursor-pointer text-[12px] text-admin-muted font-sans">Plain-text version</summary>
                  <pre className="mt-2 p-3 bg-admin-surface/70 rounded-lg border border-admin-line text-[11.5px] text-admin-ink/80 whitespace-pre-wrap font-mono overflow-x-auto">
                    {p.text}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </AdminCard>

      <AdminCard title="Audit history" subtitle="From AdminAuditLog">
        <AdminTable
          head={["Date", "Action", "Actor", "Metadata"]}
          empty="No audit events for this issue yet."
          rows={auditEvents.map((event) => [
            <span key="d" className="text-admin-body">{fmtDateTime(event.createdAt)}</span>,
            <StatusBadge key="a" value={event.action} tone="neutral" />,
            <span key="actor" className="font-mono text-[11.5px] text-admin-body">{event.actor}</span>,
            <span key="m" className="text-[11.5px] text-admin-body">
              {summarizeAuditMetadata(event.metadata)}
            </span>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
