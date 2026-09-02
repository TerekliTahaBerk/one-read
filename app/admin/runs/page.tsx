import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { prisma } from "@/lib/prisma";
import { fmtDateTime, fmtDuration } from "@/lib/admin/format";
import {
  AdminFilterBar,
  AdminFilterField,
  adminControlClass,
  adminFilterButtonClass,
  adminResetClass,
} from "@/components/admin/AdminFilters";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const ACTIVE_PRODUCTS = ["one-article"];
const RUN_STATUSES = ["RUNNING", "SUCCESS", "PARTIAL", "SKIPPED", "FAILED"];

/** Long provider/stack errors are truncated; full text stays on hover. */
function ErrorSummary({ error }: { error: string | null }) {
  if (!error) return <>—</>;
  const summary = error.split("\n")[0];
  const display = summary.length > 90 ? `${summary.slice(0, 90)}…` : summary;
  return (
    <span title={summary} className="text-dawn">
      {display}
    </span>
  );
}

/**
 * /admin/runs — every cron and manual dispatch attempt, newest first.
 *
 * Paginated at the database rather than fetched wholesale, and errors are
 * reduced to their first line so a stack trace cannot flood the table.
 */
export default async function RunsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/runs", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const product = typeof searchParams.product === "string" ? searchParams.product : undefined;
  const status = typeof searchParams.status === "string" ? searchParams.status : undefined;
  const selectedProduct = product && ACTIVE_PRODUCTS.includes(product) ? product : undefined;
  const selectedStatus = status && RUN_STATUSES.includes(status) ? status : undefined;
  const page = Math.max(1, Number.parseInt(String(searchParams.page ?? "1"), 10) || 1);

  const where = {
    productKey: selectedProduct ?? { in: ACTIVE_PRODUCTS },
    ...(selectedStatus ? { status: selectedStatus } : {}),
  };

  const [runs, total] = await Promise.all([
    prisma.operationalRun.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.operationalRun.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell
      title="Run history"
      subtitle={`${total} operational run(s) · page ${page} of ${pages}`}
    >
      <AdminFilterBar method="get">
        <AdminFilterField label="Product">
          <select name="product" defaultValue={selectedProduct ?? ""} className={adminControlClass}>
            <option value="">All products</option>
            <option value="one-article">OneArticle</option>
          </select>
        </AdminFilterField>
        <AdminFilterField label="Result">
          <select name="status" defaultValue={selectedStatus ?? ""} className={adminControlClass}>
            <option value="">All results</option>
            {RUN_STATUSES.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </AdminFilterField>
        <button className={adminFilterButtonClass}>Apply filter</button>
        <Link href="/admin/runs" className={adminResetClass}>
          Reset
        </Link>
      </AdminFilterBar>

      <AdminCard>
        <AdminTable
          head={[
            "Started",
            "Route",
            "Result",
            "Mode",
            "Duration",
            "Created",
            "Sent",
            "Skipped",
            "Failed",
            "Error",
          ]}
          empty="No operational runs recorded yet."
          rows={runs.map((run) => [
            fmtDateTime(run.startedAt),
            <span key="route" className="font-mono text-[11px]">
              {run.route}
            </span>,
            <StatusBadge
              key="status"
              value={run.status}
              tone={run.status === "SUCCESS" ? "good" : run.status === "FAILED" ? "bad" : "neutral"}
            />,
            run.dryRun ? "Preview" : "Live",
            fmtDuration(run.startedAt, run.finishedAt),
            run.generatedCount,
            run.sentCount,
            run.skippedCount,
            run.failedCount,
            <ErrorSummary key="error" error={run.error} />,
          ])}
        />
      </AdminCard>

      <AdminPagination
        page={page}
        pages={pages}
        basePath="/admin/runs"
        params={{ product: selectedProduct, status: selectedStatus }}
      />
    </AdminShell>
  );
}
