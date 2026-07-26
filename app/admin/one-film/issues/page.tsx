import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneFilmTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";
import { FILM_EMAIL_LANGUAGES } from "@/lib/options";

export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export default async function FilmIssues(props: { searchParams: Promise<{ status?: string; language?: string }> }) {
  const searchParams = await props.searchParams;
  const guard = guardAdminPage("/admin/one-film/issues", searchParams);if (!guard.ok) return <AdminNotConfigured />;
  const where: Prisma.OneFilmIssueWhereInput = {};
  if (searchParams.status) where.status = searchParams.status;
  if (searchParams.language) where.emailLanguage = searchParams.language;
  const issues = await prisma.oneFilmIssue.findMany({ where, orderBy: [{ scheduledFor: "desc" }, { updatedAt: "desc" }], take: 200 });
  const counts = issues.length ? await prisma.oneFilmDelivery.groupBy({ by: ["issueId","status"], where: { issueId: { in: issues.map((x) => x.id) } }, _count: { _all: true } }) : [];
  const count = (id:string,status:string) => counts.find((x) => x.issueId===id && x.status===status)?._count._all ?? 0;
  return <AdminShell title="Film editions" subtitle="Manual, language-specific OneFilm publishing" actions={<Link href="/admin/one-film/new" className="rounded-lg bg-admin-accent px-3 py-2 text-[12.5px] text-white">+ New edition</Link>}><AdminTabs tabs={oneFilmTabs()} active="issues" />
    <form className="mb-5 flex flex-wrap items-end gap-3 text-[12.5px]"><label><span className={label}>Status</span><select name="status" defaultValue={searchParams.status ?? ""} className={filter}><option value="">All</option>{["DRAFT","READY","SCHEDULED","SENDING","SENT","PARTIALLY_FAILED","FAILED","CANCELED"].map((x)=><option key={x}>{x}</option>)}</select></label><label><span className={label}>Language</span><select name="language" defaultValue={searchParams.language ?? ""} className={filter}><option value="">All</option>{FILM_EMAIL_LANGUAGES.map((x)=><option key={x}>{x}</option>)}</select></label><button className={filter}>Apply</button><Link href="/admin/one-film/issues" className="px-2 py-2 text-admin-muted">Reset</Link></form>
    <AdminCard><AdminTable head={["Film","Language","Status","Scheduled","Delivered","Failed","Updated",""]} empty="No film editions match." rows={issues.map((x)=>[<span key="f" className="font-medium text-admin-ink">{x.filmTitle || "Untitled"}</span>,x.emailLanguage,<StatusBadge key="s" value={x.status}/>,fmtDateTime(x.scheduledFor),count(x.id,"SENT"),count(x.id,"FAILED"),fmtDateTime(x.updatedAt),<Link key="v" href={`/admin/one-film/issues/${x.id}`} className="underline">Open</Link>])}/></AdminCard>
  </AdminShell>;
}
const filter="rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-admin-ink";
const label="mb-1 block text-[10px] uppercase tracking-eyebrow text-admin-muted";
