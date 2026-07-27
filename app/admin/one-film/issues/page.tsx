import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  AdminFilterBar,
  AdminFilterField,
  adminControlClass,
  adminFilterButtonClass,
  adminResetClass,
} from "@/components/admin/AdminFilters";
import { oneFilmTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";
import { FILM_EMAIL_LANGUAGES } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FilmIssues(
  props: { searchParams: Promise<{ status?: string; language?: string }> },
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-film/issues", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const where: Prisma.OneFilmIssueWhereInput = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.language) where.emailLanguage = searchParams.language;
  const issues = await prisma.oneFilmIssue.findMany({
    where,
    orderBy: [{ scheduledFor: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  const counts = issues.length
    ? await prisma.oneFilmDelivery.groupBy({
        by: ["issueId", "status"],
        where: { issueId: { in: issues.map((issue) => issue.id) } },
        _count: { _all: true },
      })
    : [];
  const count = (id: string, status: string) =>
    counts.find((row) => row.issueId === id && row.status === status)?._count._all ?? 0;

  return (
    <AdminShell
      title="Film editions"
      subtitle="Manual, language-specific OneFilm publishing"
      actions={
        <Link
          href="/admin/one-film/new"
          className="rounded-xl bg-admin-accent px-4 py-2.5 text-[12.5px] font-medium text-white transition hover:bg-admin-accent-strong"
        >
          + New edition
        </Link>
      }
    >
      <AdminTabs tabs={oneFilmTabs()} active="issues" />
      <AdminFilterBar method="get">
        <AdminFilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ""} className={adminControlClass}>
            <option value="">All statuses</option>
            {["DRAFT", "READY", "SCHEDULED", "SENDING", "SENT", "PARTIALLY_FAILED", "FAILED", "CANCELED"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </AdminFilterField>
        <AdminFilterField label="Language">
          <select name="language" defaultValue={searchParams.language ?? ""} className={adminControlClass}>
            <option value="">All languages</option>
            {FILM_EMAIL_LANGUAGES.map((language) => <option key={language}>{language}</option>)}
          </select>
        </AdminFilterField>
        <button className={adminFilterButtonClass}>Apply filters</button>
        <Link href="/admin/one-film/issues" className={adminResetClass}>Reset</Link>
      </AdminFilterBar>
      <AdminCard>
        <AdminTable
          head={["Film", "Language", "Status", "Scheduled", "Delivered", "Failed", "Updated", ""]}
          empty="No film editions match."
          rows={issues.map((issue) => [
            <span key="film" className="block min-w-48 font-medium text-admin-ink">{issue.filmTitle || "Untitled"}</span>,
            issue.emailLanguage,
            <StatusBadge key="status" value={issue.status} />,
            fmtDateTime(issue.scheduledFor),
            count(issue.id, "SENT"),
            count(issue.id, "FAILED"),
            fmtDateTime(issue.updatedAt),
            <Link key="view" href={`/admin/one-film/issues/${issue.id}`} className="text-admin-ink underline underline-offset-2">Open</Link>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
