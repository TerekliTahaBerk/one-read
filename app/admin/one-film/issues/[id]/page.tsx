import Link from "next/link";
import { notFound } from "next/navigation";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { FilmEditorialIssueEditor } from "@/components/admin/FilmEditorialIssueEditor";
import { prisma } from "@/lib/prisma";
import { countEligibleFilmEditorialRecipients } from "@/lib/film/editorial";
import { fmtDateTime } from "@/lib/admin/format";
import { FILM_EMAIL_LANGUAGES } from "@/lib/options";

export const runtime="nodejs"; export const dynamic="force-dynamic";
export default async function FilmIssueDetail(
  props:{params: Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const guard = await guardAdminPage(`/admin/one-film/issues/${params.id}`,searchParams);if(!guard.ok)return <AdminNotConfigured/>;
  const issue=await prisma.oneFilmIssue.findUnique({where:{id:params.id},include:{deliveries:{include:{contact:{select:{email:true}}},orderBy:{updatedAt:"desc"},take:200}}});if(!issue)notFound();
  const audienceByLanguage=Object.fromEntries(await Promise.all(FILM_EMAIL_LANGUAGES.map(async(x)=>[x,await countEligibleFilmEditorialRecipients(x)])));
  const grouped=await prisma.oneFilmDelivery.groupBy({by:["status"],where:{issueId:issue.id},_count:{_all:true}});
  const count=(s:string)=>grouped.find((x)=>x.status===s)?._count._all??0;
  return <AdminShell title={issue.filmTitle||"Untitled film"} subtitle={`${issue.emailLanguage} · ${issue.status}`} actions={<Link href="/admin/one-film/issues">← All editions</Link>}>
    <AdminCard title="Readiness and delivery" bodyClassName="p-4"><MetricGrid><MetricCard label="Status" value={issue.status}/><MetricCard label="Eligible now" value={audienceByLanguage[issue.emailLanguage]??0} tone="good"/><MetricCard label="Delivered" value={count("SENT")} tone="good"/><MetricCard label="Failed" value={count("FAILED")} tone={count("FAILED")?"warn":"default"}/><MetricCard label="Skipped" value={count("SKIPPED")}/><MetricCard label="Scheduled" value={fmtDateTime(issue.scheduledFor)}/></MetricGrid></AdminCard>
    <AdminCard title="Editor" subtitle={`Version ${issue.version} · updated ${fmtDateTime(issue.updatedAt)}`} bodyClassName="p-4" containerClassName="overflow-visible"><FilmEditorialIssueEditor audienceByLanguage={audienceByLanguage} issue={{...issue,scheduledFor:issue.scheduledFor?.toISOString()??null}}/></AdminCard>
    <AdminCard title="Deliveries" subtitle="Latest 200 recipient records"><AdminTable head={["Email","Status","Attempts","Last attempt","Sent","Message ID","Reason"]} empty="No delivery records yet." rows={issue.deliveries.map((x)=>[x.contact.email,<StatusBadge key="s" value={x.status}/>,x.attemptCount,fmtDateTime(x.lastAttemptAt),fmtDateTime(x.sentAt),<MonoShort key="m" value={x.providerMessageId}/>,x.failedReason??x.skippedReason??"—"])}/></AdminCard>
  </AdminShell>;
}
