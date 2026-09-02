import Link from "next/link";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid, DefList } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { countDeliveryStates } from "@/lib/admin/delivery-queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * /admin/delivery/today — the single screen an operator opens to answer
 * "did today's edition go out, and is anything waiting on me?".
 *
 * Logical send state (QUEUED/SENDING/SENT/FAILED) and provider delivery state
 * (ACCEPTED/DELIVERED/…) are shown side by side on purpose: Resend accepting a
 * request is not proof a mailbox received it.
 */
export default async function DeliveryTodayPage() {
  const guard = await guardAdminPage("/admin/delivery/today");
  if (!guard.ok) return <AdminNotConfigured />;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);

  const issue = await prisma.oneArticleIssue.findFirst({
    where: {
      OR: [{ scheduledFor: { gte: start, lt: end } }, { sentAt: { gte: start, lt: end } }],
    },
    orderBy: { scheduledFor: "asc" },
  });

  const [counts, latestRun] = await Promise.all([
    countDeliveryStates(issue ? { issueId: issue.id } : null),
    prisma.operationalRun.findFirst({
      where: { productKey: "one-article" },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  if (!issue) {
    return (
      <AdminShell title="Delivery today" subtitle="OneArticle send state and provider confirmation">
        <AdminCard bodyClassName="p-5">
          <p className="font-sans text-[13px] text-admin-muted">
            No edition is scheduled or sent for today.
          </p>
          <Link
            href="/admin/one-article/new"
            className="mt-3 inline-block font-sans text-[13px] text-admin-ink underline underline-offset-2"
          >
            Create an edition →
          </Link>
        </AdminCard>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Delivery today" subtitle="OneArticle send state and provider confirmation">
      <AdminCard title={issue.headline} bodyClassName="p-0">
        <DefList
          rows={[
            ["Reading language", issue.readingLanguage],
            ["Scheduled", fmtDateTime(issue.scheduledFor)],
            ["Edition state", <StatusBadge key="state" value={issue.status} />],
            [
              "Latest operational run",
              latestRun ? (
                <span key="run">
                  <StatusBadge value={latestRun.status} /> ·{" "}
                  {fmtDateTime(latestRun.finishedAt ?? latestRun.startedAt)}
                </span>
              ) : (
                "No run recorded"
              ),
            ],
          ]}
        />
      </AdminCard>

      <AdminCard
        title="Recipients"
        subtitle="Accepted means Resend took the request. Delivered means a provider webhook confirmed the mailbox received it."
        bodyClassName="p-4"
      >
        <MetricGrid>
          <MetricCard label="Eligible" value={counts.total} />
          <MetricCard label="Queued" value={counts.logical.QUEUED ?? 0} />
          <MetricCard label="Sending" value={counts.logical.SENDING ?? 0} />
          <MetricCard label="Accepted" value={counts.provider.ACCEPTED ?? 0} />
          <MetricCard label="Delivered" value={counts.provider.DELIVERED ?? 0} tone="good" />
          <MetricCard
            label="Delayed"
            value={counts.provider.DELAYED ?? 0}
            tone={(counts.provider.DELAYED ?? 0) > 0 ? "warn" : "default"}
          />
          <MetricCard
            label="Failed"
            value={counts.failed}
            tone={counts.failed > 0 ? "warn" : "default"}
            hint="Logical send failures and provider-confirmed failures"
          />
          <MetricCard
            label="Ambiguous"
            value={counts.ambiguous}
            tone={counts.ambiguous > 0 ? "warn" : "default"}
            hint="Acceptance could not be proven; never auto-resent"
          />
          <MetricCard label="Bounced" value={counts.provider.BOUNCED ?? 0} />
          <MetricCard label="Complained" value={counts.provider.COMPLAINED ?? 0} />
          <MetricCard label="Skipped" value={counts.logical.SKIPPED ?? 0} />
          <MetricCard label="Awaiting provider update" value={counts.awaitingProvider} />
        </MetricGrid>
        <Link
          href="/admin/delivery/failures"
          className="font-sans text-[13px] text-admin-ink underline underline-offset-2"
        >
          Open failure &amp; recovery workbench →
        </Link>
      </AdminCard>
    </AdminShell>
  );
}
