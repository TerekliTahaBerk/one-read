import type { OneArticleIssue, ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasValidAccess } from "@/lib/billing/access";
import { ONE_ARTICLE_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";
import { preferencesComplete } from "@/lib/subscriptions";
import { issueToMobileDto } from "@/lib/mobile/article";

export type TodayState =
  | "UPCOMING"
  | "AVAILABLE"
  | "READ"
  | "NO_EDITION"
  | "SUBSCRIPTION_REQUIRED"
  | "ACCOUNT_INCOMPLETE"
  | "DELIVERY_FAILED_BUT_READABLE";

export type TodayResult = {
  state: TodayState;
  serverTime: string;
  issue: ReturnType<typeof issueToMobileDto> | null;
};

const PUBLISHED_STATES = ["SENDING", "SENT", "PARTIALLY_FAILED", "FAILED"];

function dayKey(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function subscriptionHasAccess(sub: ProductSubscription | undefined, now: Date): boolean {
  return Boolean(sub && hasValidAccess(sub, now).allowed);
}

export async function resolveTodayForContact(contactId: string, now = new Date()): Promise<TodayResult> {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    include: {
      subscriptions: {
        where: { productKey: { in: [ONE_READ_PRODUCT_KEY, ONE_ARTICLE_PRODUCT_KEY] } },
        include: { preferences: true },
      },
    },
  });
  const serverTime = now.toISOString();
  const holder = contact?.subscriptions.find((sub) => sub.productKey === ONE_ARTICLE_PRODUCT_KEY);
  if (!contact || !preferencesComplete(holder?.preferences ?? null)) {
    return { state: "ACCOUNT_INCOMPLETE", serverTime, issue: null };
  }
  const umbrella = contact.subscriptions.find((sub) => sub.productKey === ONE_READ_PRODUCT_KEY);
  if (!subscriptionHasAccess(umbrella, now) && !subscriptionHasAccess(holder, now)) {
    return { state: "SUBSCRIPTION_REQUIRED", serverTime, issue: null };
  }

  const deliveries = await prisma.oneArticleDelivery.findMany({
    where: { contactId },
    include: {
      issue: true,
    },
    orderBy: { issue: { scheduledFor: "desc" } },
    take: 32,
  });
  const today = deliveries.filter(({ issue }) => {
    const date = issue.scheduledFor;
    return issue.mobileEnabled !== false && date && dayKey(date, issue.timezone) === dayKey(now, issue.timezone);
  });
  const future = today.find(({ issue }) => issue.scheduledFor && issue.scheduledFor > now);
  const readable = today.find(
    ({ issue }) =>
      issue.scheduledFor &&
      issue.scheduledFor <= now &&
      PUBLISHED_STATES.includes(issue.status),
  );
  if (!readable) {
    return { state: future ? "UPCOMING" : "NO_EDITION", serverTime, issue: null };
  }
  const reading = await prisma.readingState.findUnique({
    where: { contactId_issueId: { contactId, issueId: readable.issueId } },
  });
  const state: TodayState = reading?.completedAt
    ? "READ"
    : readable.status === "FAILED"
      ? "DELIVERY_FAILED_BUT_READABLE"
      : "AVAILABLE";
  return {
    state,
    serverTime,
    issue: issueToMobileDto(readable.issue as OneArticleIssue, reading?.progress ?? 0),
  };
}
