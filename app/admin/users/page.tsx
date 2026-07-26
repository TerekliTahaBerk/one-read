import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { fmtDate } from "@/lib/admin/format";
import { CreateUserButton } from "@/components/admin/CreateUserButton";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminUsersPage(
  props: {
    searchParams: Promise<{ q?: string; status?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = guardAdminPage("/admin/users", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const contacts = await prisma.contact.findMany({
    include: {
      subscriptions: {
        include: { preferences: true, filmPreferences: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let rows = contacts.map((contact) => {
    const umbrella = contact.subscriptions.find((sub) => sub.productKey === "one-read");
    const article = contact.subscriptions.find((sub) => sub.productKey === "one-article");
    const film = contact.subscriptions.find((sub) => sub.productKey === "one-film");
    return { contact, umbrella, article, film };
  });

  if (searchParams.q) {
    const needle = searchParams.q.toLowerCase();
    rows = rows.filter(({ contact }) => contact.email.toLowerCase().includes(needle));
  }
  if (searchParams.status) {
    rows = rows.filter(({ umbrella, article, film }) =>
      [umbrella?.status, article?.status, film?.status].includes(searchParams.status),
    );
  }

  return (
    <AdminShell
      title="Users"
      subtitle={`${rows.length} of ${contacts.length} contacts across OneArticle and OneFilm`}
      actions={
        <>
          <a
            href="/api/admin/users/export"
            className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-[12.5px] text-admin-ink hover:bg-admin-sink"
          >
            Download CSV
          </a>
          <CreateUserButton />
        </>
      }
    >
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 text-[12.5px] font-sans">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Search email</span>
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="email contains…"
            className="w-56 rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Any product status</span>
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-admin-ink"
          >
            <option value="">Any</option>
            {STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-admin-ink hover:bg-admin-sink">
          Apply
        </button>
        <Link href="/admin/users" className="px-2 py-1.5 text-admin-muted hover:text-admin-ink">Reset</Link>
      </form>

      <AdminCard>
        <AdminTable
          head={[
            "Email",
            "OneRead",
            "OneArticle",
            "Article interests",
            "Reading",
            "OneFilm",
            "Film genres",
            "Film moods",
            "Created",
            "",
          ]}
          empty="No users match these filters."
          rows={rows.map(({ contact, umbrella, article, film }) => [
            <span key="e" className="text-admin-ink">{contact.email}</span>,
            umbrella ? <StatusBadge key="or" value={umbrella.status} /> : "—",
            article ? <StatusBadge key="oa" value={article.status} /> : "—",
            article?.preferences?.interests.join(", ") || "—",
            article?.preferences?.summaryLanguage ?? "—",
            film ? <StatusBadge key="of" value={film.status} /> : "—",
            film?.filmPreferences?.preferredGenres.join(", ") || "—",
            film?.filmPreferences?.moods.join(", ") || "—",
            <span key="c" className="text-admin-body">{fmtDate(contact.createdAt)}</span>,
            <Link key="v" href={`/admin/users/${contact.id}`} className="text-admin-ink underline underline-offset-2">
              View
            </Link>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}

const STATUSES = [
  "ACTIVE_PAID",
  "TRIALING",
  "ADMIN_OVERRIDE",
  "PENDING_CHECKOUT",
  "PENDING_PREFERENCES",
  "PAST_DUE",
  "CANCELED",
  "TRIAL_EXPIRED",
  "EXPIRED",
] as const;
