import { prisma } from "@/lib/prisma";
import { getResendStatus } from "@/lib/resend";

/** How long a delivery may sit in SENDING before it counts as stuck. */
const STALE_SENDING_MINUTES = 15;

export interface SystemHealth {
  healthy: boolean;
  headline: string;
  latestRun: { status: string; startedAt: Date; finishedAt: Date | null } | null;
  latestFailedRunAt: Date | null;
  lastSuccessfulDispatchAt: Date | null;
  staleSending: number;
  overdueIssues: number;
  ambiguous: number;
  unprocessedBillingEvents: number;
  environment: string;
  resendConfigured: boolean;
  sentryConfigured: boolean;
  heartbeatConfigured: boolean;
}

/**
 * Summarises OneRead's own operational state. Every signal is a count or a
 * timestamp derived from the database — nothing here polls an external vendor,
 * because Vercel, Sentry, and Better Stack already do that far better.
 */
export async function getSystemHealth(now = new Date()): Promise<SystemHealth> {
  const staleCutoff = new Date(now.getTime() - STALE_SENDING_MINUTES * 60_000);

  const [
    latestRun,
    latestFailedRun,
    lastSuccessfulRun,
    staleSending,
    overdueIssues,
    ambiguous,
    unprocessedBillingEvents,
  ] = await Promise.all([
    prisma.operationalRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { status: true, startedAt: true, finishedAt: true },
    }),
    prisma.operationalRun.findFirst({
      where: { status: { in: ["FAILED", "PARTIAL"] } },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.operationalRun.findFirst({
      where: { status: "SUCCESS", sentCount: { gt: 0 } },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.oneArticleDelivery.count({
      where: { status: "SENDING", lastAttemptAt: { lt: staleCutoff } },
    }),
    prisma.oneArticleIssue.count({
      where: { status: "SCHEDULED", scheduledFor: { lt: now } },
    }),
    prisma.oneArticleDelivery.count({ where: { status: "RECONCILIATION_REQUIRED" } }),
    prisma.billingEvent.count({ where: { processedAt: null } }),
  ]);

  const problems: string[] = [];
  if (staleSending > 0) problems.push(`${staleSending} stuck send(s)`);
  if (overdueIssues > 0) problems.push(`${overdueIssues} overdue edition(s)`);
  if (ambiguous > 0) problems.push(`${ambiguous} ambiguous delivery(s)`);
  if (unprocessedBillingEvents > 0) {
    problems.push(`${unprocessedBillingEvents} unprocessed billing event(s)`);
  }
  if (latestRun?.status === "FAILED") problems.push("the latest run failed");

  return {
    healthy: problems.length === 0,
    headline:
      problems.length === 0
        ? "All first-party signals healthy"
        : `Needs attention: ${problems.join(", ")}`,
    latestRun,
    latestFailedRunAt: latestFailedRun?.startedAt ?? null,
    lastSuccessfulDispatchAt: lastSuccessfulRun?.startedAt ?? null,
    staleSending,
    overdueIssues,
    ambiguous,
    unprocessedBillingEvents,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    resendConfigured: getResendStatus().hasApiKey,
    sentryConfigured: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
    heartbeatConfigured: Boolean(process.env.BETTER_STACK_CRON_HEARTBEAT_URL),
  };
}
