import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { IssueEmptyActions } from "@/components/admin/IssueEmptyActions";
import { ApproveAllButton } from "@/components/admin/ApproveAllButton";
import { loadIssues } from "@/lib/admin/issues-read";
import { oneArticleTabs } from "@/lib/admin/nav";
import { topicBySlug } from "@/lib/topics";
import { fmtDate, fmtDateTime, todayUtc } from "@/lib/admin/format";
import { labelFor } from "@/lib/admin/labels";
import { getOneArticleIssueReadiness } from "@/lib/admin/one-article-ops";
import { QuickIssueAction } from "@/components/admin/QuickIssueAction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/one-article/issues — prepared daily issues (TopicDailyPicks) for a date. */
export default async function IssuesListPage({
  searchParams,
}: {
  searchParams: { date?: string; status?: string; approval?: string };
}) {
  const guard = guardAdminPage("/admin/one-article/issues", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const today = todayUtc();
  const iso = searchParams.date ?? today.toISOString().slice(0, 10);
  const date = new Date(iso + "T00:00:00Z");

  const readiness = await getOneArticleIssueReadiness({ date });
  let issues = await loadIssues(date);
  if (searchParams.status) issues = issues.filter((i) => i.status === searchParams.status);
  if (searchParams.approval) issues = issues.filter((i) => i.approvalStatus === searchParams.approval);

  return (
    <AdminShell
      title="Issues"
      subtitle={`Prepared issues for ${iso}`}
      actions={
        <div className="flex items-center gap-2">
          <ApproveAllButton endpoint="/api/admin/issues/action" date={iso} label={`Approve all ready · ${iso}`} />
          <Link
            href="/admin/manual-article"
            className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink"
          >
            + Create issue from article
          </Link>
        </div>
      }
    >
      <AdminTabs tabs={oneArticleTabs()} active="issues" />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 text-[12.5px] font-sans">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={iso}
            className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Approval</span>
          <select name="approval" defaultValue={searchParams.approval ?? ""} className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink">
            <option value="">Any</option>
            {["PENDING", "APPROVED", "SCHEDULED", "CANCELED"].map((s) => (
              <option key={s} value={s}>{labelFor(s)}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-admin-ink hover:bg-admin-sink">
          Apply
        </button>
        <Link href="/admin/one-article/issues" className="px-2 py-1.5 text-admin-muted hover:text-admin-ink">
          Today
        </Link>
      </form>

      {issues.length === 0 ? (
        <AdminCard title="No issue prepared" subtitle={readiness.status} bodyClassName="p-4">
          <div className="space-y-4 text-[12.5px] font-sans">
            <p className="text-admin-body">
              No issue exists for {iso}. Prepare creates content only; it never sends subscriber email.
            </p>
            {[...readiness.blockers, ...readiness.warnings].length > 0 && (
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-eyebrow text-admin-muted">Current blockers</div>
                <ul className="space-y-1 text-dawn">
                  {[...readiness.blockers, ...readiness.warnings].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            <p className="text-admin-body">Next action: {readiness.nextAction}</p>
            <IssueEmptyActions dateIso={iso} />
          </div>
        </AdminCard>
      ) : (
        <AdminCard>
          <AdminTable
            head={[
              "Date",
              "Topic",
              "Source language",
              "Article",
              "Status",
              "Approval",
              "Scheduled",
              "Languages",
              "Recipients",
              "Delivered",
              "Skipped",
              "Failed",
              "",
              "",
            ]}
            empty="No issues prepared for this day yet."
            rows={issues.map((i) => [
              <span key="d" className="text-admin-body">{fmtDate(i.date)}</span>,
              topicBySlug(i.topic)?.label ?? i.topic,
              <span key="sl" className="text-admin-body">{i.sourceLanguage}</span>,
              <span key="a" className="text-admin-ink/90">{i.articleTitle}</span>,
              <StatusBadge key="s" value={i.status} />,
              <StatusBadge key="ap" value={i.approvalStatus} />,
              <span key="sc" className="text-admin-body">{fmtDateTime(i.scheduledFor)}</span>,
              <span key="l" className="text-admin-body">{i.summaryLanguages.join(", ") || "—"}</span>,
              <span key="rc" title="Recipients for this issue">{i.recipientCount}</span>,
              i.sentCount,
              i.skippedCount,
              <span key="f" className={i.failedCount > 0 ? "text-dawn" : ""}>{i.failedCount}</span>,
              <Link key="v" href={`/admin/one-article/issues/${i.id}`} className="text-admin-ink underline underline-offset-2">
                View
              </Link>,
              i.approvalStatus === "PENDING" && i.status === "READY" ? <QuickIssueAction key="qa" endpoint="/api/admin/issues/action" idKey="pickId" id={i.id} action="approve" label="Approve" /> : null,
            ])}
          />
        </AdminCard>
      )}
    </AdminShell>
  );
}
