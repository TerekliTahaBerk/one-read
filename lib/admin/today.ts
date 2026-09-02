import { prisma } from "@/lib/prisma";
import { countDeliveryStates, type DeliveryStateCounts } from "@/lib/admin/delivery-queries";

export interface TodayDelivery {
  issue: {
    id: string;
    headline: string;
    readingLanguage: string;
    status: string;
    scheduledFor: Date | null;
  } | null;
  counts: DeliveryStateCounts;
  /** True when something on today's edition needs an operator decision. */
  needsAttention: boolean;
}

/**
 * Today's OneArticle edition and its delivery reality, for the admin home.
 *
 * "Today" covers an edition scheduled for today or one that actually sent
 * today, so a late-running send still appears on the overview rather than
 * silently dropping off it at midnight.
 */
export async function getTodayDelivery(now = new Date()): Promise<TodayDelivery> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);

  const issue = await prisma.oneArticleIssue.findFirst({
    where: {
      OR: [{ scheduledFor: { gte: start, lt: end } }, { sentAt: { gte: start, lt: end } }],
    },
    orderBy: { scheduledFor: "asc" },
    select: {
      id: true,
      headline: true,
      readingLanguage: true,
      status: true,
      scheduledFor: true,
    },
  });

  const counts = await countDeliveryStates(issue ? { issueId: issue.id } : null);

  return {
    issue,
    counts,
    needsAttention: counts.failed > 0 || counts.ambiguous > 0,
  };
}
