import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { FilmEditorialIssueEditor } from "@/components/admin/FilmEditorialIssueEditor";
import { oneFilmTabs } from "@/lib/admin/nav";
import { FILM_EMAIL_LANGUAGES } from "@/lib/options";
import { countEligibleFilmEditorialRecipients } from "@/lib/film/editorial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function NewFilmIssue(props: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const searchParams = await props.searchParams;
  const guard = guardAdminPage("/admin/one-film/new", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const audienceByLanguage = Object.fromEntries(await Promise.all(FILM_EMAIL_LANGUAGES.map(async (x) => [x, await countEligibleFilmEditorialRecipients(x)])));
  return <AdminShell title="New OneFilm edition" subtitle="Write, preview and schedule one film note"><AdminTabs tabs={oneFilmTabs()} active="new" /><AdminCard title="Editorial content" subtitle="Nothing is sent until explicitly scheduled" bodyClassName="p-4" containerClassName="overflow-visible"><FilmEditorialIssueEditor audienceByLanguage={audienceByLanguage} /></AdminCard></AdminShell>;
}
