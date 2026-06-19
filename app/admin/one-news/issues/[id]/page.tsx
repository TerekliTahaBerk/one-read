import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneNewsTabs } from "@/lib/admin/nav";
import { getNewsIssue } from "@/lib/admin/news-queries";
import { renderNewsEmail } from "@/lib/news/email-template";
import { NewsIssueActionsBar } from "@/components/admin/NewsIssueActionsBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneNewsIssueDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage(`/admin/one-news/issues/${params.id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const issue = await getNewsIssue(params.id);
  if (!issue) notFound();

  const isEmpty = issue.status !== "GENERATED";
  const rendered = isEmpty
    ? null
    : renderNewsEmail(issue, {
        date: issue.issueDate.toISOString().slice(0, 10),
        briefingLanguage: issue.briefingLanguage,
        regionFocus: issue.regionFocus,
        links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
      });

  return (
    <AdminShell title={issue.subject} subtitle={issue.segmentKey}>
      <AdminTabs tabs={oneNewsTabs()} active="issues" />
      {issue.status === "NO_SOURCES" && (
        <AdminCard title="No source material available" bodyClassName="p-4">
          <p className="text-[13px] text-dawn font-sans">
            This briefing has no real source stories for its segment and date. OneNews does not invent news — add source stories in the Sources tab, then regenerate.
          </p>
        </AdminCard>
      )}
      <AdminCard title="Actions" bodyClassName="p-4">
        <NewsIssueActionsBar
          issueId={issue.id}
          dateIso={issue.issueDate.toISOString().slice(0, 10)}
          segmentKey={issue.segmentKey}
          defaultTestEmail={process.env.ADMIN_EMAIL ?? ""}
        />
      </AdminCard>
      <AdminCard title="Metadata">
        <DefList
          rows={[
            ["Date", issue.issueDate.toISOString().slice(0, 10)],
            ["Status", issue.status],
            ["Approval", issue.approvalStatus],
            ["Subject", issue.subject],
            ["Provider", issue.generationProvider ?? "n/a"],
            ["Model", issue.generationModel ?? "n/a"],
            ["Recipients (send rows)", issue.sends.length],
          ]}
        />
      </AdminCard>
      {rendered && (
        <AdminCard title="Text preview" bodyClassName="p-4">
          <pre className="whitespace-pre-wrap text-[12.5px] leading-6 text-ink">{rendered.text}</pre>
        </AdminCard>
      )}
      <AdminCard title="Structured JSON" bodyClassName="p-4">
        <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap text-[12px] leading-5 text-ink">
          {JSON.stringify(issue.contentJson, null, 2)}
        </pre>
      </AdminCard>
    </AdminShell>
  );
}
