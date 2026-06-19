import { prisma } from "@/lib/prisma";
import { ONE_FILM_PRODUCT_KEY } from "@/lib/options";
import { evaluateFilmEligibility } from "@/lib/film/subscriptions";

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getFilmOverviewMetrics() {
  const date = todayUtc();
  const [subs, issuesToday, sendsToday, catalogCount] = await Promise.all([
    prisma.productSubscription.findMany({
      where: { productKey: ONE_FILM_PRODUCT_KEY },
      include: { contact: { select: { email: true } }, filmPreferences: true },
    }),
    prisma.filmDailyIssue.findMany({ where: { issueDate: date } }),
    prisma.filmDailySend.findMany({ where: { issueDate: date } }),
    prisma.filmCatalogEntry.count(),
  ]);

  const eligible = subs.filter((s) => evaluateFilmEligibility(s).allowed).length;
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
      noFilm: issuesToday.filter((i) => i.status === "NO_FILM").length,
      notGenerated: issuesToday.filter((i) => i.status !== "GENERATED").length,
    },
    catalog: { total: catalogCount },
    sends: {
      total: sendsToday.length,
      sent: sendsToday.filter((s) => s.status === "SENT").length,
      skipped: sendsToday.filter((s) => s.status === "SKIPPED").length,
      failed: sendsToday.filter((s) => s.status === "FAILED").length,
    },
  };
}

export async function getFilmSubscribers(limit = 100) {
  return prisma.productSubscription.findMany({
    where: { productKey: ONE_FILM_PRODUCT_KEY },
    include: { contact: { select: { email: true } }, filmPreferences: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getFilmIssues(limit = 100) {
  return prisma.filmDailyIssue.findMany({
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: { _count: { select: { sends: true } } },
  });
}

export async function getFilmIssue(id: string) {
  return prisma.filmDailyIssue.findUnique({
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

export async function getFilmSends(limit = 100) {
  return prisma.filmDailySend.findMany({
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: limit,
    include: {
      contact: { select: { email: true } },
      issue: { select: { title: true, segmentKey: true } },
    },
  });
}

export async function getFilmCatalog(limit = 100) {
  return prisma.filmCatalogEntry.findMany({
    orderBy: [{ usedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: limit,
  });
}
