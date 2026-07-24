import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function OneLingoOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-lingo", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  return (
    <AdminShell title="OneLingo" subtitle="Inactive product · collecting demand on the waitlist">
      <AdminCard title="Product status">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value="waitlist" tone="muted" />
          <p className="text-[13px] text-admin-body">
            New subscriptions, generation, approvals, and deliveries are disabled.
            Historical data remains preserved.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3 text-[13px]">
          <a
            href="/waitlist?product=onelingo"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-admin-accent px-3 py-2 text-white"
          >
            Open waitlist ↗
          </a>
          <Link
            href="/admin/products"
            className="rounded-lg border border-admin-line-strong px-3 py-2 text-admin-ink"
          >
            Back to products
          </Link>
        </div>
      </AdminCard>
    </AdminShell>
  );
}
