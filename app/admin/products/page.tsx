import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { getLingoOverviewMetrics } from "@/lib/admin/lingo-queries";
import { getOneReadOverviewMetrics } from "@/lib/admin/oneread-queries";
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

  const [m, lingo, oneRead] = await Promise.all([
    getOverviewMetrics(),
    getLingoOverviewMetrics(),
    getOneReadOverviewMetrics(),
  ]);

  return (
    <AdminShell
      title="Products"
      subtitle="OneRead product family"
    >
      <AdminCard>
        <AdminTable
          head={["Product", "Status", "Public visibility", "Source", "Operational data", "Actions"]}
          rows={PRODUCTS.map((p) => [
            <span key="n" className="flex items-center gap-2 font-medium text-ink">
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
              <span key="d" className="text-ash">From ProductSubscription</span>
            ) : (
              <span key="d" className="text-fog">External: Tally, not connected</span>
            ),
            p.key === "one-read" ? (
              <span key="c">{`${oneRead.activeOrTrialing} active/trialing · ${oneRead.pendingCheckout} pending checkout · ${oneRead.total} total`}</span>
            ) : p.key === "one-article" ? (
              <span key="c">{`${m.users.subscribed} active · ${m.eligibleCount} eligible`}</span>
            ) : p.key === "one-lingo" ? (
              <span key="c">{`${lingo.subscribers.activeOrTrialing} active/trialing · ${lingo.subscribers.eligible} eligible`}</span>
            ) : p.connected ? (
              <span key="c" className="text-fog">Use product operations for detailed metrics</span>
            ) : (
              <span key="c" className="text-fog">Waitlist count not available</span>
            ),
            p.key === "one-read" ? (
              <Link key="a" href="/admin/settings" className="text-ink underline underline-offset-2">
                Billing settings →
              </Link>
            ) : p.key === "one-article" ? (
              <Link key="a" href="/admin/one-article" className="text-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : p.key === "one-lingo" ? (
              <Link key="a" href="/admin/one-lingo" className="text-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : p.key === "one-news" ? (
              <Link key="a" href="/admin/one-news" className="text-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : p.key === "one-film" ? (
              <Link key="a" href="/admin/one-film" className="text-ink underline underline-offset-2">
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
        Public visibility is separate from backend availability. Hidden products
        stay available in admin and backend routes for future relaunch or
        subscriber management.
      </p>
    </AdminShell>
  );
}

function productDotClass(key: string): string {
  switch (key) {
    case "one-read":
      return "bg-ink";
    case "one-article":
      return "bg-sky-500";
    case "one-lingo":
      return "bg-[#6F5AA8]";
    case "one-news":
      return "bg-[#53647A]";
    case "one-film":
      return "bg-[#7B5E8E]";
    case "one-dish":
      return "bg-[#B96A4B]";
    default:
      return "bg-fog";
  }
}
