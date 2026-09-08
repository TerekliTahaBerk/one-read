import Link from "next/link";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid, DefList } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import {
  countDeliveryStates,
  countOneNewsDeliveryStates,
  type DeliveryStateCounts,
} from "@/lib/admin/delivery-queries";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * /admin/delivery/today — the single screen an operator opens to answer
 * "did today's editions go out, and is anything waiting on me?".
 *
 * Both products are shown, because an operator asking that question is asking
 * it about OneRead, not about one dispatcher. Logical send state
 * (QUEUED/SENDING/SENT/FAILED) and provider delivery state
 * (ACCEPTED/DELIVERED/…) are shown side by side on purpose: Resend accepting a
 * request is not proof a mailbox received it.
 */
export default async function DeliveryTodayPage() {
  const guard = await guardAdminPage("/admin/delivery/today");
  if (!guard.ok) return <AdminNotConfigured />;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);
  const today = {
    OR: [{ scheduledFor: { gte: start, lt: end } }, { sentAt: { gte: start, lt: end } }],
  };

  const [articleIssue, newsIssue] = await Promise.all([
    prisma.oneArticleIssue.findFirst({ where: today, orderBy: { scheduledFor: "asc" } }),
    prisma.oneNewsIssue.findFirst({ where: today, orderBy: { scheduledFor: "asc" } }),
  ]);

  const [articleCounts, newsCounts, articleRun, newsRun] = await Promise.all([
    countDeliveryStates(articleIssue ? { issueId: articleIssue.id } : null),
    countOneNewsDeliveryStates(newsIssue ? { issueId: newsIssue.id } : null),
    prisma.operationalRun.findFirst({ where: { productKey: "one-article" }, orderBy: { startedAt: "desc" } }),
    prisma.operationalRun.findFirst({ where: { productKey: "one-news" }, orderBy: { startedAt: "desc" } }),
  ]);

  return (
    <AdminShell
      title="Delivery today"
      subtitle="Send state and provider confirmation for every product that dispatches"
    >
      <ProductToday
        product="OneArticle"
        issue={articleIssue}
        counts={articleCounts}
        run={articleRun}
        issueHref={articleIssue ? `/admin/one-article/issues/${articleIssue.id}` : "/admin/one-article/new"}
        createHref="/admin/one-article/new"
      />
      <ProductToday
        product="OneNews"
        issue={newsIssue}
        counts={newsCounts}
        run={newsRun}
        issueHref={newsIssue ? `/admin/one-news/issues/${newsIssue.id}` : "/admin/one-news/new"}
        createHref="/admin/one-news/new"
      />
      <p className="font-sans text-[12px] leading-5 text-admin-muted">
        <Link href="/admin/delivery/failures" className="text-admin-ink underline underline-offset-2">
          Open the failure &amp; recovery workbench
        </Link>{" "}
        for anything above that needs a decision.
      </p>
    </AdminShell>
  );
}

type TodayIssue = {
  id: string;
  headline: string;
  readingLanguage: string;
  scheduledFor: Date | null;
  status: string;
} | null;

function ProductToday({
  product,
  issue,
  counts,
  run,
  issueHref,
  createHref,
}: {
  product: string;
  issue: TodayIssue;
  counts: DeliveryStateCounts;
  run: { status: string; startedAt: Date; finishedAt: Date | null } | null;
  issueHref: string;
  createHref: string;
}) {
  if (!issue) {
    return (
      <AdminCard title={product} bodyClassName="p-5">
        <p className="font-sans text-[13px] text-admin-muted">
          No {product} edition is scheduled or sent for today.
        </p>
        <div className="mt-3 font-sans text-[12.5px] text-admin-muted">
          Latest run:{" "}
          {run ? (
            <>
              <StatusBadge value={run.status} /> · {fmtDateTime(run.finishedAt ?? run.startedAt)}
            </>
          ) : (
            "No run recorded"
          )}
        </div>
        <Link
          href={createHref}
          className="mt-3 inline-block font-sans text-[13px] text-admin-ink underline underline-offset-2"
        >
          Create an edition →
        </Link>
      </AdminCard>
    );
  }

  return (
    <AdminCard title={`${product} · ${issue.headline}`} bodyClassName="p-0">
      <DefList
        rows={[
          ["Reading language", issue.readingLanguage],
          ["Scheduled", issue.scheduledFor ? fmtDateTime(issue.scheduledFor) : "Not scheduled"],
          ["Edition state", <StatusBadge key="state" value={issue.status} />],
          [
            "Latest operational run",
            run ? (
              <span key="run">
                <StatusBadge value={run.status} /> · {fmtDateTime(run.finishedAt ?? run.startedAt)}
              </span>
            ) : (
              "No run recorded"
            ),
          ],
          [
            "Edition",
            <Link key="link" href={issueHref} className="text-admin-ink underline underline-offset-2">
              Open editorial screen →
            </Link>,
          ],
        ]}
      />
      <div className="border-t border-admin-line p-4">
        <p className="mb-3 font-sans text-[12px] leading-5 text-admin-muted">
          Accepted means Resend took the request. Delivered means a provider webhook confirmed
          the mailbox received it.
        </p>
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
      </div>
    </AdminCard>
  );
}
