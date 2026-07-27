import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable, MonoShort } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { oneFilmTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function FilmSends(props:{searchParams: Promise<{status?:string;email?:string}>}) {
 const searchParams = await props.searchParams;
 const guard = await guardAdminPage("/admin/one-film/sends",searchParams);if(!guard.ok)return <AdminNotConfigured/>;
 const where:Prisma.OneFilmDeliveryWhereInput={};if(searchParams.status)where.status=searchParams.status;if(searchParams.email)where.contact={email:{contains:searchParams.email,mode:"insensitive"}};
 const rows=await prisma.oneFilmDelivery.findMany({where,include:{contact:{select:{email:true}},issue:{select:{id:true,filmTitle:true,emailLanguage:true}}},orderBy:{updatedAt:"desc"},take:300});
 return <AdminShell title="Film deliveries" subtitle={`${rows.length} recent records`}><AdminTabs tabs={oneFilmTabs()} active="sends"/><form className="mb-5 flex gap-3"><select name="status" defaultValue={searchParams.status??""} className={filter}><option value="">All statuses</option>{["QUEUED","SENDING","SENT","FAILED","SKIPPED"].map(x=><option key={x}>{x}</option>)}</select><input name="email" defaultValue={searchParams.email??""} className={filter} placeholder="Email"/><button className={filter}>Apply</button></form><AdminCard><AdminTable head={["Updated","Email","Film","Language","Status","Attempts","Sent","Message ID","Reason"]} empty="No deliveries match." rows={rows.map(x=>[fmtDateTime(x.updatedAt),x.contact.email,<Link key="i" href={`/admin/one-film/issues/${x.issue.id}`} className="underline">{x.issue.filmTitle}</Link>,x.issue.emailLanguage,<StatusBadge key="s" value={x.status}/>,x.attemptCount,fmtDateTime(x.sentAt),<MonoShort key="m" value={x.providerMessageId}/>,x.failedReason??x.skippedReason??"—"])}/></AdminCard></AdminShell>;
}
const filter="rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-admin-ink";
