import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { PRODUCTS } from "@/lib/admin/products";
import { WAITLIST_FORM_URL } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/products — product-level overview across the OneRead family. */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/products", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const m = await getOverviewMetrics();
  const openProducts = PRODUCTS.filter((p) => p.key === "one-article" || p.key === "one-film");

  return (
    <AdminShell
      title="Products"
      subtitle="OneRead product family"
    >
      <AdminCard>
        <AdminTable
          head={["Product", "Status", "Public visibility", "Subscribers from", "Summary", "Actions"]}
          rows={openProducts.map((p) => [
            <span key="n" className="flex items-center gap-2 font-medium text-admin-ink">
              <span className={`h-2.5 w-2.5 rounded-full ${productDotClass(p.key)}`} />
              {p.name}
            </span>,
            <StatusBadge
              key="s"
              value={p.status === "live" ? "live" : "waitlist"}
              tone={p.status === "live" ? "good" : "muted"}
            />,
            <StatusBadge
              key="v"
              value={p.publicVisible ? "public" : "hidden"}
              tone={p.publicVisible ? "good" : "muted"}
            />,
            p.connected ? (
              <span key="d" className="text-admin-body">Subscriptions</span>
            ) : (
              <span key="d" className="text-admin-muted">Waitlist (Tally)</span>
            ),
            p.key === "one-article" ? (
              <span key="c">{`${m.users.subscribed} active · ${m.eligibleCount} eligible`}</span>
            ) : p.connected ? (
              <span key="c" className="text-admin-muted">Use product operations for detailed metrics</span>
            ) : (
              <span key="c" className="text-admin-muted">Waitlist count not available</span>
            ),
            p.key === "one-article" ? (
              <Link key="a" href="/admin/one-article" className="text-admin-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : p.key === "one-film" ? (
              <Link key="a" href="/admin/one-film" className="text-admin-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : (
              <a
                key="a"
                href={WAITLIST_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-admin-body underline underline-offset-2"
              >
                Tally form ↗
              </a>
            ),
          ])}
        />
      </AdminCard>

      <p className="text-[12.5px] text-admin-muted font-sans">
        The operations panel currently includes only the two open products:
        OneArticle and OneFilm.
      </p>
    </AdminShell>
  );
}

function productDotClass(key: string): string {
  switch (key) {
    case "one-read":
      return "bg-admin-ink";
    case "one-article":
      return "bg-sky-500";
    case "one-lingo":
      return "bg-[#6F5AA8]";
    case "one-film":
      return "bg-[#7B5E8E]";
    case "one-dish":
      return "bg-[#B96A4B]";
    default:
      return "bg-admin-muted";
  }
}
