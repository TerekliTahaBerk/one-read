import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { oneFilmTabs } from "@/lib/admin/nav";
import { prisma } from "@/lib/prisma";
import { resolveOneFilmEligibilityForContact } from "@/lib/oneread/access";
import { fmtDate } from "@/lib/admin/format";
export const runtime="nodejs";export const dynamic="force-dynamic";
export default async function FilmSubscribers({searchParams}:{searchParams:Record<string,string|string[]|undefined>}){
 const guard=guardAdminPage("/admin/one-film/subscribers",searchParams);if(!guard.ok)return <AdminNotConfigured/>;
 const subs=await prisma.productSubscription.findMany({where:{productKey:"one-film"},include:{filmPreferences:true,contact:{select:{email:true}}},orderBy:{createdAt:"desc"}});
 const rows=await Promise.all(subs.map(async sub=>({sub,result:await resolveOneFilmEligibilityForContact(sub.contactId)})));const eligible=rows.filter(x=>x.result.allowed).length;
 return <AdminShell title="Film subscribers" subtitle={`${eligible} of ${rows.length} eligible`}><AdminTabs tabs={oneFilmTabs()} active="subscribers"/><AdminCard><AdminTable head={["Email","Access","Eligible","Plan","Provider","Period ends","Email language","Genres",""]} empty="No OneFilm subscribers yet." rows={rows.map(({sub,result})=>[sub.contact.email,<StatusBadge key="s" value={sub.status}/>,<EligibilityBadge key="e" allowed={result.allowed} reason={result.reason}/>,sub.plan??"—",sub.paymentProvider??"—",fmtDate(sub.currentPeriodEnd),sub.filmPreferences?.emailLanguage??"Needs preferences",sub.filmPreferences?.preferredGenres.join(", ")||"—",<Link key="v" href={`/admin/users/${sub.contactId}`} className="underline">View</Link>])}/></AdminCard></AdminShell>;
}
