import { prisma } from "@/lib/prisma";
import { issueToMobileDto } from "@/lib/mobile/article";

const PUBLISHED_STATES = ["SENDING", "SENT", "PARTIALLY_FAILED", "FAILED"];

export async function accessibleIssue(contactId: string, issueId: string, now = new Date()) {
  const delivery = await prisma.oneArticleDelivery.findUnique({
    where: { issueId_contactId: { issueId, contactId } },
    include: { issue: true },
  });
  if (
    !delivery ||
    !delivery.issue.scheduledFor ||
    delivery.issue.scheduledFor > now ||
    !delivery.issue.mobileEnabled ||
    !PUBLISHED_STATES.includes(delivery.issue.status)
  ) return null;
  const reading = await prisma.readingState.findUnique({
    where: { contactId_issueId: { contactId, issueId } },
  });
  return issueToMobileDto(delivery.issue, reading?.progress ?? 0);
}

export async function accessibleIssueList(
  contactId: string,
  take: number,
  skip = 0,
  now = new Date(),
  options: { exploreOnly?: boolean } = {},
) {
  const deliveries = await prisma.oneArticleDelivery.findMany({
    where: {
      contactId,
      issue: {
        status: { in: PUBLISHED_STATES },
        scheduledFor: { lte: now },
        mobileEnabled: true,
        ...(options.exploreOnly ? { mobileExploreEnabled: true } : {}),
      },
    },
    include: { issue: true },
    orderBy: options.exploreOnly
      ? [{ issue: { mobilePriority: "desc" } }, { issue: { scheduledFor: "desc" } }]
      : { issue: { scheduledFor: "desc" } },
    take,
    skip,
  });
  const readings = await prisma.readingState.findMany({
    where: { contactId, issueId: { in: deliveries.map((item) => item.issueId) } },
  });
  const progress = new Map(readings.map((item) => [item.issueId, item.progress]));
  return deliveries.map((item) => issueToMobileDto(item.issue, progress.get(item.issueId) ?? 0));
}
