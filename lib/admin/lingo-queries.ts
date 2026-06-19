import { prisma } from "@/lib/prisma";
import { ONE_LINGO_PRODUCT_KEY } from "@/lib/options";
import { evaluateLingoEligibility } from "@/lib/lingo/subscriptions";

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getLingoOverviewMetrics() {
  const date = todayUtc();
  const [subs, lessonsToday, sendsToday] = await Promise.all([
    prisma.productSubscription.findMany({
      where: { productKey: ONE_LINGO_PRODUCT_KEY },
      include: { contact: { select: { email: true } }, lingoPreferences: true },
    }),
    prisma.lingoDailyLesson.findMany({ where: { lessonDate: date } }),
    prisma.lingoDailySend.findMany({ where: { lessonDate: date } }),
  ]);

  const eligible = subs.filter((s) => evaluateLingoEligibility(s).allowed).length;
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
    lessons: {
      total: lessonsToday.length,
      approvedOrScheduled: lessonsToday.filter((l) => ["APPROVED", "SCHEDULED"].includes(l.approvalStatus)).length,
      needsReview: lessonsToday.filter((l) => l.approvalStatus === "NEEDS_REVIEW").length,
      notGenerated: lessonsToday.filter((l) => l.status !== "GENERATED").length,
    },
    sends: {
      total: sendsToday.length,
      sent: sendsToday.filter((s) => s.status === "SENT").length,
      skipped: sendsToday.filter((s) => s.status === "SKIPPED").length,
      failed: sendsToday.filter((s) => s.status === "FAILED").length,
    },
  };
}

export async function getLingoSubscribers(limit = 100) {
  return prisma.productSubscription.findMany({
    where: { productKey: ONE_LINGO_PRODUCT_KEY },
    include: { contact: { select: { email: true } }, lingoPreferences: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getLingoLessons(limit = 100) {
  return prisma.lingoDailyLesson.findMany({
    orderBy: [{ lessonDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { _count: { select: { sends: true } } },
  });
}

export async function getLingoLesson(id: string) {
  return prisma.lingoDailyLesson.findUnique({
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

export async function getLingoSends(limit = 100) {
  return prisma.lingoDailySend.findMany({
    orderBy: [{ lessonDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      contact: { select: { email: true } },
      lesson: { select: { title: true, segmentKey: true } },
    },
  });
}
