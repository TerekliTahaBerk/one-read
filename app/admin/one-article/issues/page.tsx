import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { loadIssues } from "@/lib/admin/issues-read";
import { oneArticleTabs } from "@/lib/admin/nav";
import { topicBySlug } from "@/lib/topics";
import { fmtDate, fmtDateTime, todayUtc } from "@/lib/admin/format";

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

  let issues = await loadIssues(date);
  if (searchParams.status) issues = issues.filter((i) => i.status === searchParams.status);
  if (searchParams.approval) issues = issues.filter((i) => i.approvalStatus === searchParams.approval);

  return (
    <AdminShell
      title="Issues"
      subtitle={`Prepared issues for ${iso}`}
      actions={
        <Link
          href="/admin/manual-article"
          className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream"
        >
          + Create issue from article
        </Link>
      }
    >
      <AdminTabs tabs={oneArticleTabs()} active="issues" />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 text-[12.5px] font-sans">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-fog">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={iso}
            className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-fog">Approval</span>
          <select name="approval" defaultValue={searchParams.approval ?? ""} className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-ink">
            <option value="">Any</option>
            {["PENDING", "APPROVED", "SCHEDULED", "CANCELED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-ink hover:bg-cream">
          Apply
        </button>
        <Link href="/admin/one-article/issues" className="px-2 py-1.5 text-fog hover:text-ink">
          Today
        </Link>
      </form>

      <AdminCard>
        <AdminTable
          head={[
            "Date",
            "Topic",
            "Src lang",
            "Article",
            "Editorial",
            "Approval",
            "Scheduled",
            "Langs",
            "Recipients",
            "Sent",
            "Skip",
            "Fail",
            "",
          ]}
          empty="No issues prepared for this day yet."
          rows={issues.map((i) => [
            <span key="d" className="text-ash">{fmtDate(i.date)}</span>,
            topicBySlug(i.topic)?.label ?? i.topic,
            <span key="sl" className="text-ash">{i.sourceLanguage}</span>,
            <span key="a" className="text-ink/90">{i.articleTitle}</span>,
            <StatusBadge key="s" value={i.status} />,
            <StatusBadge key="ap" value={i.approvalStatus} />,
            <span key="sc" className="text-ash">{fmtDateTime(i.scheduledFor)}</span>,
            <span key="l" className="text-ash">{i.summaryLanguages.join(", ") || "—"}</span>,
            i.recipientCount,
            i.sentCount,
            i.skippedCount,
            <span key="f" className={i.failedCount > 0 ? "text-dawn" : ""}>{i.failedCount}</span>,
            <Link key="v" href={`/admin/one-article/issues/${i.id}`} className="text-ink underline underline-offset-2">
              View
            </Link>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
