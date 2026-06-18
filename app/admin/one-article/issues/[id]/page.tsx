import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { loadIssueDetail } from "@/lib/admin/issues-read";
import { IssueActionsBar } from "@/components/admin/IssueActionsBar";
import { topicBySlug } from "@/lib/topics";
import { fmtDate, fmtDateTime } from "@/lib/admin/format";

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

  return (
    <AdminShell
      title={topicBySlug(pick.topic)?.label ?? pick.topic}
      subtitle={`${fmtDate(pick.date)} · ${pick.sourceLanguage} source`}
      actions={
        <Link href={`/admin/one-article/issues?date=${fmtDate(pick.date)}`} className="text-[13px] text-ash hover:text-ink">
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
          defaultTestEmail={process.env.FROM_EMAIL ?? ""}
        />
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
              <a key="u" href={pick.article.url} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2 break-all">
                {pick.article.url}
              </a>,
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

      <AdminCard title="Recipients" bodyClassName="p-4">
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
            <Link key="e" href={`/admin/users/${r.subscriptionId}`} className="text-ink underline underline-offset-2">
              {r.email}
            </Link>,
            <EligibilityBadge key="el" allowed={r.eligible} reason={r.reason} />,
            <span key="l" className="text-ash">{r.summaryLanguage ?? "—"}</span>,
            <span key="i" className="text-ash">{r.interestsCount}</span>,
            r.alreadySent ? <StatusBadge key="s" value="SENT" /> : <span key="s" className="text-fog">—</span>,
          ])}
        />
      </AdminCard>

      <AdminCard title="Email preview" subtitle={`${previews.length} language(s) · rendering only, no send`}>
        {previews.length === 0 ? (
          <div className="px-4 py-8 text-[13px] text-fog">
            No summary generated for this issue yet.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {previews.map((p) => (
              <div key={p.summaryId} className="p-4">
                <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12.5px]">
                  <span className="font-serif text-ink text-[15px]">{p.subject}</span>
                  <span className="text-fog">{p.summaryLanguage}</span>
                  <StatusBadge value={p.status} />
                  <span className="text-ash">confidence {p.confidence ?? "—"}</span>
                  <span className="font-mono text-[11px] text-ash">{p.generator ?? "—"}</span>
                  {(p.subjectOverride || p.previewTextOverride) && (
                    <span className="text-[10px] uppercase tracking-eyebrow text-amber-700">admin-edited</span>
                  )}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-line text-[10px] uppercase tracking-eyebrow text-fog">
                    render-only · not sent
                  </span>
                </div>
                {p.previewText && (
                  <div className="mb-2 text-[12px] text-fog font-sans">Preview text: {p.previewText}</div>
                )}
                <iframe
                  title={`email-${p.summaryId}`}
                  srcDoc={p.html}
                  sandbox=""
                  className="w-full h-[460px] rounded-lg border border-line bg-white"
                />
                <details className="mt-2">
                  <summary className="cursor-pointer text-[12px] text-fog font-sans">Plain-text version</summary>
                  <pre className="mt-2 p-3 bg-paper/70 rounded-lg border border-line text-[11.5px] text-ink/80 whitespace-pre-wrap font-mono overflow-x-auto">
                    {p.text}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </AdminShell>
  );
}
