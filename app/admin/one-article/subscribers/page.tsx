import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge, EligibilityBadge } from "@/components/admin/StatusBadge";
import { loadOneArticleSubs, toSubRow } from "@/lib/admin/queries";
import { oneArticleTabs } from "@/lib/admin/nav";
import { fmtDate } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/one-article/subscribers — every OneArticle subscriber with the
 * canonical eligibility verdict (and reason) shown inline. When someone is not
 * receiving email, the reason is immediately visible.
 */
export default async function OneArticleSubscribersPage({
  searchParams,
}: {
  searchParams: { reason?: string };
}) {
  const guard = guardAdminPage("/admin/one-article/subscribers", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const now = new Date();
  const subs = await loadOneArticleSubs();
  let rows = subs.map((s) => toSubRow(s, now));
  if (searchParams.reason) {
    rows = rows.filter((r) => r.reason === searchParams.reason);
  }

  const eligible = rows.filter((r) => r.eligible).length;

  return (
    <AdminShell
      title="Subscribers"
      subtitle={`${eligible} of ${rows.length} eligible for delivery`}
    >
      <AdminTabs tabs={oneArticleTabs()} active="subscribers" />

      <AdminCard>
        <AdminTable
          head={[
            "Email",
            "Access",
            "Eligible",
            "Plan",
            "Provider",
            "Period ends",
            "Languages",
            "Interests",
            "",
          ]}
          empty="No subscribers match."
          rows={rows.map((r) => [
            <span key="e" className="text-admin-ink">{r.email}</span>,
            <StatusBadge key="s" value={r.status} />,
            <EligibilityBadge key="el" allowed={r.eligible} reason={r.reason} />,
            <span key="pl" className="text-admin-body">{r.plan ?? "—"}</span>,
            <span key="pv" className="text-admin-body">{r.provider ?? "—"}</span>,
            <span key="pe" className="text-admin-body">{fmtDate(r.currentPeriodEnd)}</span>,
            <span key="l" className="text-admin-body">
              {(r.sourceLanguage ?? "—") + " → " + (r.summaryLanguage ?? "—")}
            </span>,
            <span key="i" className="text-admin-body">{r.interestsCount}</span>,
            <Link key="v" href={`/admin/users/${r.id}`} className="text-admin-ink underline underline-offset-2">
              View
            </Link>,
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}
