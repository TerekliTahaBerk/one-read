import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmIssue } from "@/lib/admin/film-queries";
import { renderFilmEmail } from "@/lib/film/email-template";
import { FilmIssueActionsBar } from "@/components/admin/FilmIssueActionsBar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmIssueDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage(`/admin/one-film/issues/${params.id}`, searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const issue = await getFilmIssue(params.id);
  if (!issue) notFound();

  const rendered =
    issue.status !== "GENERATED"
      ? null
      : renderFilmEmail(issue, {
          date: issue.issueDate.toISOString().slice(0, 10),
          emailLanguage: issue.emailLanguage,
          links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
        });

  return (
    <AdminShell title={issue.subject} subtitle={issue.segmentKey}>
      <AdminTabs tabs={oneFilmTabs()} active="issues" />
      {issue.status === "NO_FILM" && (
        <AdminCard title="No film available" bodyClassName="p-4">
          <p className="text-[13px] text-dawn font-sans">
            No catalog film fit this segment. OneFilm does not invent films — add a film in the Catalog tab, then regenerate.
          </p>
        </AdminCard>
      )}
      <AdminCard title="Actions" bodyClassName="p-4">
        <FilmIssueActionsBar
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
            ["Film", issue.filmTitle ?? "n/a"],
            ["Director", issue.director ?? "n/a"],
            ["Year", issue.filmYear ?? "n/a"],
            ["Provider", issue.generationProvider ?? "n/a"],
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
