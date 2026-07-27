import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneFilmTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { FILM_EMAIL_LANGUAGES } from "@/lib/options";
import { countEligibleFilmEditorialRecipients } from "@/lib/film/editorial";
import { getControls } from "@/lib/admin/settings-store";
import { getResendStatus } from "@/lib/resend";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmOverview(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> }
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/one-film", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const [next, recent, statusCounts, controls, languageCounts] = await Promise.all([
    prisma.oneFilmIssue.findFirst({ where: { status: "SCHEDULED", scheduledFor: { gte: new Date() } }, orderBy: { scheduledFor: "asc" } }),
    prisma.oneFilmIssue.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.oneFilmIssue.groupBy({ by: ["status"], _count: { _all: true } }),
    getControls(),
    Promise.all(FILM_EMAIL_LANGUAGES.map(async (language) => [language, await countEligibleFilmEditorialRecipients(language)] as const)),
  ]);
  const resend = getResendStatus();
  const count = (status: string) => statusCounts.find((row) => row.status === status)?._count._all ?? 0;
  const healthy = controls.film.cronEnabled && !controls.film.dryRun && resend.hasApiKey;
  return <AdminShell title="OneFilm" subtitle="Manual editorial film publishing">
    <AdminTabs tabs={oneFilmTabs()} active="overview" />
    <AdminCard bodyClassName="p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div>
      <div className="flex items-center gap-2"><StatusBadge value={healthy ? "READY" : "NEEDS ATTENTION"} tone={healthy ? "good" : "bad"} /><span className="text-[12px] text-admin-muted">Editorial dispatcher</span></div>
      <h2 className="mt-3 font-serif text-[24px] text-admin-ink">{next ? `Next: ${next.filmTitle}` : "No film edition scheduled"}</h2>
      <p className="mt-1 text-[13px] text-admin-body">{next ? `${next.emailLanguage} · ${fmtDateTime(next.scheduledFor)}` : "Write a film note, review it, then schedule delivery."}</p>
    </div><Link href="/admin/one-film/new" className="inline-flex h-11 items-center justify-center rounded-lg bg-admin-accent px-5 text-[13px] font-medium text-white">Write new edition</Link></div></AdminCard>
    <AdminCard title="Publishing queue" bodyClassName="p-4"><MetricGrid>
      {["DRAFT","READY","SCHEDULED","SENT","PARTIALLY_FAILED","FAILED"].map((status) => <MetricCard key={status} label={status.replace("_"," ")} value={count(status)} tone={status.includes("FAILED") && count(status) ? "warn" : ["SCHEDULED","SENT"].includes(status) ? "good" : "default"} />)}
    </MetricGrid></AdminCard>
    <AdminCard title="Audience by email language" subtitle="Eligible right now" bodyClassName="p-4"><MetricGrid>{languageCounts.map(([language, recipients]) => <MetricCard key={language} label={language} value={recipients} tone={recipients ? "good" : "default"} />)}</MetricGrid></AdminCard>
    <AdminCard title="Recent editions" bodyClassName="p-0"><div className="divide-y divide-admin-line">{recent.length === 0 ? <p className="p-5 text-[13px] text-admin-muted">No editions yet.</p> : recent.map((issue) => <Link key={issue.id} href={`/admin/one-film/issues/${issue.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-admin-sink"><div><div className="text-[13.5px] font-medium text-admin-ink">{issue.filmTitle}</div><div className="mt-1 text-[11.5px] text-admin-muted">{issue.emailLanguage} · updated {fmtDateTime(issue.updatedAt)}</div></div><StatusBadge value={issue.status} /></Link>)}</div></AdminCard>
    <div className="mb-8 flex flex-wrap gap-3 text-[12.5px] text-admin-body"><span>Cron: {controls.film.cronEnabled ? "on" : "off"}</span><span>·</span><span>Delivery: {controls.film.dryRun ? "preview only" : "live"}</span><span>·</span><span>Email: {resend.hasApiKey ? "connected" : "not configured"}</span><span>·</span><span>Mode: manual editorial, no AI generation</span></div>
  </AdminShell>;
}
