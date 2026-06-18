import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { PRODUCTS, WAITLIST_NOTE } from "@/lib/admin/products";
import { WAITLIST_FORM_URL } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/products — product-level overview across the OneRead family. */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const guard = guardAdminPage(searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const { token } = guard;
  const q = `?token=${encodeURIComponent(token)}`;

  const m = await getOverviewMetrics();

  return (
    <AdminShell
      token={token}
      title="Products"
      subtitle="OneRead product family"
    >
      <AdminCard>
        <AdminTable
          head={["Product", "Status", "Data", "Subscribers", "Actions"]}
          rows={PRODUCTS.map((p) => [
            <span key="n" className="font-medium text-ink">{p.name}</span>,
            <StatusBadge
              key="s"
              value={p.status === "live" ? "live" : "waitlist"}
              tone={p.status === "live" ? "good" : "muted"}
            />,
            p.connected ? (
              <span key="d" className="text-ash">Database</span>
            ) : (
              <span key="d" className="text-fog">{WAITLIST_NOTE}</span>
            ),
            p.connected ? (
              <span key="c">{`${m.users.subscribed} active · ${m.eligibleCount} eligible`}</span>
            ) : (
              <span key="c" className="text-fog">—</span>
            ),
            p.key === "one-article" ? (
              <Link key="a" href={`/admin/one-article${q}`} className="text-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : (
              <a
                key="a"
                href={WAITLIST_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ash underline underline-offset-2"
              >
                Tally form ↗
              </a>
            ),
          ])}
        />
      </AdminCard>

      <p className="text-[12.5px] text-fog font-sans">
        Waitlist signups for OneLingo, OneGoal, OnePlate, and OneMove are collected
        through an external Tally form and are not yet connected to this database.
        Counts will appear here once an integration is added.
      </p>
    </AdminShell>
  );
}
