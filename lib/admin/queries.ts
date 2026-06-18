import type { ArticlePreferences, ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ONE_ARTICLE_PRODUCT_KEY } from "@/lib/options";
import { evaluateEligibility } from "@/lib/subscriptions";
import type { EligibilityReason } from "@/lib/billing/access";
import { todayUtc } from "@/lib/admin/format";

/**
 * Read-only aggregations for the admin dashboards. Everything here is derived
 * from real rows; when a metric cannot be computed it is reported as such
 * rather than guessed. Eligibility is always taken from the canonical
 * `evaluateEligibility` (which wraps `canReceiveOneArticleEmail`) — never
 * re-derived here.
 */

export type SubWithRels = ProductSubscription & {
  preferences: ArticlePreferences | null;
  contact: { email: string; createdAt: Date };
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Loads every OneArticle subscription with the relations the admin needs. */
export async function loadOneArticleSubs(): Promise<SubWithRels[]> {
  return prisma.productSubscription.findMany({
    where: { productKey: ONE_ARTICLE_PRODUCT_KEY },
    include: {
      preferences: true,
      contact: { select: { email: true, createdAt: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

function countBy<T>(items: readonly T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export interface OverviewMetrics {
  users: {
    totalContacts: number;
    subscribed: number;
    paused: number;
    suppressed: number;
    newToday: number;
    new7d: number;
    new30d: number;
  };
  access: Record<string, number>;
  email: Record<string, number>;
  eligibleCount: number;
  payment: {
    paidCount: number;
    providers: Record<string, number>;
    plans: Record<string, number>;
    renewals7d: number;
    renewals30d: number;
  };
  ops: {
    isoDate: string;
    picksToday: number;
    approvedToday: number;
    scheduledToday: number;
    sentToday: number;
    queuedToday: number;
    skippedToday: number;
    failedToday: number;
    lastSendAt: Date | null;
    nextSendUtc: string;
  };
}

export async function getOverviewMetrics(now = new Date()): Promise<OverviewMetrics> {
  const today = todayUtc();
  const iso = today.toISOString().slice(0, 10);

  const [subs, totalContacts, sendsToday, picksToday, lastSent] = await Promise.all([
    loadOneArticleSubs(),
    prisma.contact.count(),
    prisma.dailySend.groupBy({
      by: ["status"],
      where: { date: today },
      _count: { _all: true },
    }),
    prisma.topicDailyPick.findMany({
      where: { date: today },
      select: { approvalStatus: true },
    }),
    prisma.dailySend.findFirst({
      where: { status: "SENT", sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
  ]);

  const access = countBy(subs, (s) => s.status);
  const email = countBy(subs, (s) => s.emailDeliveryStatus);
  const eligibleCount = subs.filter((s) => evaluateEligibility(s, now).allowed).length;

  // Contact "new" windows (umbrella-level — counts all contacts, not just
  // OneArticle subscribers).
  const [newToday, new7d, new30d] = await Promise.all([
    prisma.contact.count({ where: { createdAt: { gte: today } } }),
    prisma.contact.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
    prisma.contact.count({ where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } } }),
  ]);

  const paidStatuses = new Set(["ACTIVE_PAID", "PAST_DUE", "CANCELED"]);
  const paidCount = subs.filter(
    (s) => s.paidAt != null || paidStatuses.has(s.status),
  ).length;

  const providers = countBy(
    subs.filter((s) => s.paymentProvider),
    (s) => s.paymentProvider as string,
  );
  const plans = countBy(
    subs.filter((s) => s.plan),
    (s) => s.plan as string,
  );

  const within = (end: Date | null, days: number): boolean =>
    !!end && end > now && end.getTime() - now.getTime() <= days * DAY_MS;
  const renewableStatuses = new Set(["ACTIVE_PAID", "TRIALING"]);
  const renewals7d = subs.filter(
    (s) => renewableStatuses.has(s.status) && !s.cancelAtPeriodEnd && within(s.currentPeriodEnd, 7),
  ).length;
  const renewals30d = subs.filter(
    (s) => renewableStatuses.has(s.status) && !s.cancelAtPeriodEnd && within(s.currentPeriodEnd, 30),
  ).length;

  const sendByStatus: Record<string, number> = {};
  for (const row of sendsToday) sendByStatus[row.status] = row._count._all;

  const approvalToday = countBy(picksToday, (p) => p.approvalStatus);

  // Next scheduled cron send (07:00 Europe/Istanbul = 04:00 UTC). If now is past
  // today's 04:00 UTC, the next run is tomorrow.
  const todays4Utc = new Date(`${iso}T04:00:00Z`);
  const nextSend = now < todays4Utc ? todays4Utc : new Date(todays4Utc.getTime() + DAY_MS);

  return {
    users: {
      totalContacts,
      subscribed: email["SUBSCRIBED"] ?? 0,
      paused: email["UNSUBSCRIBED"] ?? 0,
      suppressed: email["SUPPRESSED"] ?? 0,
      newToday,
      new7d,
      new30d,
    },
    access,
    email,
    eligibleCount,
    payment: {
      paidCount,
      providers,
      plans,
      renewals7d,
      renewals30d,
    },
    ops: {
      isoDate: iso,
      picksToday: picksToday.length,
      approvedToday: (approvalToday["APPROVED"] ?? 0) + (approvalToday["SCHEDULED"] ?? 0),
      scheduledToday: approvalToday["SCHEDULED"] ?? 0,
      sentToday: sendByStatus["SENT"] ?? 0,
      queuedToday: sendByStatus["QUEUED"] ?? 0,
      skippedToday: sendByStatus["SKIPPED"] ?? 0,
      failedToday: sendByStatus["FAILED"] ?? 0,
      lastSendAt: lastSent?.sentAt ?? null,
      nextSendUtc: nextSend.toISOString().slice(0, 16).replace("T", " ") + " UTC",
    },
  };
}

/** A flattened, presentation-ready view of one subscription for tables. */
export interface SubRow {
  id: string;
  email: string;
  status: string;
  emailDeliveryStatus: string;
  provider: string | null;
  plan: string | null;
  adminOverride: boolean;
  currentPeriodEnd: Date | null;
  paidAt: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  interestsCount: number;
  summaryLanguage: string | null;
  sourceLanguage: string | null;
  eligible: boolean;
  reason: EligibilityReason;
  suppressed: boolean;
}

export function toSubRow(s: SubWithRels, now = new Date()): SubRow {
  const elig = evaluateEligibility(s, now);
  return {
    id: s.id,
    email: s.contact.email,
    status: s.status,
    emailDeliveryStatus: s.emailDeliveryStatus,
    provider: s.paymentProvider,
    plan: s.plan,
    adminOverride: s.adminOverride,
    currentPeriodEnd: s.currentPeriodEnd,
    paidAt: s.paidAt,
    trialEndsAt: s.trialEndsAt,
    createdAt: s.contact.createdAt,
    updatedAt: s.updatedAt,
    interestsCount: s.preferences?.interests.length ?? 0,
    summaryLanguage: s.preferences?.summaryLanguage ?? null,
    sourceLanguage: s.preferences?.sourceLanguage ?? null,
    eligible: elig.allowed,
    reason: elig.reason,
    suppressed: s.emailDeliveryStatus === "SUPPRESSED",
  };
}
