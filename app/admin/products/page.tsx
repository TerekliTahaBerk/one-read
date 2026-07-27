import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { PRODUCTS } from "@/lib/admin/products";
import { getOneReadOverviewMetrics } from "@/lib/admin/oneread-queries";
import { prisma } from "@/lib/prisma";
import { resolveOneFilmEligibilityForContact } from "@/lib/oneread/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /admin/products — product-level overview across the OneRead family. */
export default async function AdminProductsPage(
  props: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
  }
) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/products", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [m, oneRead, filmSubscriptions] = await Promise.all([
    getOverviewMetrics(),
    getOneReadOverviewMetrics(),
    prisma.productSubscription.findMany({
      where: { productKey: "one-film" },
      select: { contactId: true },
    }),
  ]);
  const filmEligibility = await Promise.all(
    filmSubscriptions.map((subscription) =>
      resolveOneFilmEligibilityForContact(subscription.contactId),
    ),
  );
  const filmEligible = filmEligibility.filter((result) => result.allowed).length;
  const articleTotal = Object.values(m.email).reduce((sum, count) => sum + count, 0);
  const openProducts = PRODUCTS.filter((p) =>
    ["one-read", "one-article", "one-film"].includes(p.key),
  );

  return (
    <AdminShell
      title="Products"
      subtitle="Live products and umbrella access"
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
            p.status === "live" && p.connected ? (
              <span key="d" className="text-admin-body">Subscriptions</span>
            ) : (
              <span key="d" className="text-admin-muted">Waitlist</span>
            ),
            p.key === "one-read" ? (
              <span key="c">{`${oneRead.total} accounts · ${oneRead.activeOrTrialing} active`}</span>
            ) : p.key === "one-article" ? (
              <span key="c">{`${articleTotal} subscribers · ${m.eligibleCount} eligible`}</span>
            ) : p.key === "one-film" ? (
              <span key="c">{`${filmSubscriptions.length} subscribers · ${filmEligible} eligible`}</span>
            ) : (
              <span key="c" className="text-admin-muted">Waitlist count not available</span>
            ),
            p.key === "one-read" ? (
              <Link key="a" href="/admin/users" className="text-admin-ink underline underline-offset-2">
                Accounts →
              </Link>
            ) : p.key === "one-article" ? (
              <Link key="a" href="/admin/one-article" className="text-admin-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : p.key === "one-film" ? (
              <Link key="a" href="/admin/one-film" className="text-admin-ink underline underline-offset-2">
                Operations →
              </Link>
            ) : (
              <span key="a" className="text-admin-muted">Not available</span>
            ),
          ])}
        />
      </AdminCard>

      <p className="text-[12.5px] text-admin-muted font-sans">
        OneArticle and OneFilm use the same manual editorial workflow, with
        independent audiences, editions, delivery controls, and audit history.
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
