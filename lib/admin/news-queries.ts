import { prisma } from "@/lib/prisma";
import { ONE_NEWS_PRODUCT_KEY } from "@/lib/options";
import { evaluateNewsEligibility } from "@/lib/news/subscriptions";

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getNewsOverviewMetrics() {
  const date = todayUtc();
  const [subs, issuesToday, sendsToday, sourcesToday] = await Promise.all([
    prisma.productSubscription.findMany({
      where: { productKey: ONE_NEWS_PRODUCT_KEY },
      include: { contact: { select: { email: true } }, newsPreferences: true },
    }),
    prisma.newsDailyIssue.findMany({ where: { issueDate: date } }),
    prisma.newsDailySend.findMany({ where: { issueDate: date } }),
    prisma.newsSourceStory.count({ where: { storyDate: { gte: new Date(date.getTime() - 3 * 86400000) } } }),
  ]);

  const eligible = subs.filter((s) => evaluateNewsEligibility(s).allowed).length;
  return {
    isoDate: date.toISOString().slice(0, 10),
    subscribers: {
      total: subs.length,
      pendingPreferences: subs.filter((s) => s.status === "PENDING_PREFERENCES").length,
      pendingCheckout: subs.filter((s) => s.status === "PENDING_CHECKOUT").length,
      activeOrTrialing: subs.filter((s) => ["ACTIVE_PAID", "TRIALING", "ADMIN_OVERRIDE"].includes(s.status)).length,
      paused: subs.filter((s) => s.emailDeliveryStatus === "UNSUBSCRIBED").length,
      suppressed: subs.filter((s) => s.emailDeliveryStatus === "SUPPRESSED").length,
      eligible,
    },
    issues: {
      total: issuesToday.length,
      approvedOrScheduled: issuesToday.filter((i) => ["APPROVED", "SCHEDULED"].includes(i.approvalStatus)).length,
      needsReview: issuesToday.filter((i) => i.approvalStatus === "NEEDS_REVIEW").length,
      noSources: issuesToday.filter((i) => i.status === "NO_SOURCES").length,
      notGenerated: issuesToday.filter((i) => i.status !== "GENERATED").length,
    },
    sources: { recentWindow: sourcesToday },
    sends: {
      total: sendsToday.length,
      sent: sendsToday.filter((s) => s.status === "SENT").length,
      skipped: sendsToday.filter((s) => s.status === "SKIPPED").length,
      failed: sendsToday.filter((s) => s.status === "FAILED").length,
    },
  };
}

export async function getNewsSubscribers(limit = 100) {
  return prisma.productSubscription.findMany({
    where: { productKey: ONE_NEWS_PRODUCT_KEY },
    include: { contact: { select: { email: true } }, newsPreferences: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getNewsIssues(limit = 100) {
  return prisma.newsDailyIssue.findMany({
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { _count: { select: { sends: true } } },
  });
}

export async function getNewsIssue(id: string) {
  return prisma.newsDailyIssue.findUnique({
    where: { id },
    include: {
      sends: {
        include: { contact: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
}

export async function getNewsSends(limit = 100) {
  return prisma.newsDailySend.findMany({
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      contact: { select: { email: true } },
      issue: { select: { title: true, segmentKey: true } },
    },
  });
}

export async function getNewsSourceStories(limit = 100) {
  return prisma.newsSourceStory.findMany({
    orderBy: [{ storyDate: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
