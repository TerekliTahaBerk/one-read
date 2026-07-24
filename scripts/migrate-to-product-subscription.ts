/**
 * OneRead — backfill legacy `Subscriber` rows into the future-proof
 * Contact / ProductSubscription / ArticlePreferences model.
 *
 * Idempotent and additive: it never drops the `Subscriber` table and never
 * touches a ProductSubscription that already exists for a (contact, product).
 * Safe to run repeatedly — e.g. once before cutover and again immediately
 * after deploy to catch rows created during the rollout window.
 *
 * Status mapping (per the approved plan — existing ACTIVE users get a fresh
 * 7-day trial; founder allowlist stays comped):
 *   - founder / always-subscribed  → ADMIN_OVERRIDE (never charged)
 *   - ACTIVE                       → TRIALING, trialEndsAt = now + TRIAL_DAYS
 *   - PENDING_PREFERENCES          → PENDING_PREFERENCES
 *   - UNSUBSCRIBED                 → TRIAL_EXPIRED + emailDeliveryStatus UNSUBSCRIBED
 *   - PAUSED                       → TRIALING + emailDeliveryStatus UNSUBSCRIBED
 *
 * Usage:
 *   npx tsx scripts/migrate-to-product-subscription.ts            # apply
 *   npx tsx scripts/migrate-to-product-subscription.ts --dry-run  # report only
 */

import { prisma } from "../lib/prisma";
import {
  ONE_ARTICLE_PRODUCT_KEY,
  TRIAL_DAYS,
  isAlwaysSubscribed,
} from "../lib/options";

const DAY_MS = 24 * 60 * 60 * 1000;

type MappedState = {
  status: string;
  emailDeliveryStatus: string;
  adminOverride: boolean;
  adminNote: string | null;
  trial: boolean;
};

function mapState(legacyStatus: string, email: string): MappedState {
  if (isAlwaysSubscribed(email)) {
    return {
      status: "ADMIN_OVERRIDE",
      emailDeliveryStatus: "SUBSCRIBED",
      adminOverride: true,
      adminNote: "always-subscribed (founder)",
      trial: false,
    };
  }
  switch (legacyStatus) {
    case "ACTIVE":
      return {
        status: "TRIALING",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        adminNote: "migrated: fresh 7-day trial",
        trial: true,
      };
    case "UNSUBSCRIBED":
      return {
        status: "TRIAL_EXPIRED",
        emailDeliveryStatus: "UNSUBSCRIBED",
        adminOverride: false,
        adminNote: "migrated: was UNSUBSCRIBED",
        trial: false,
      };
    case "PAUSED":
      return {
        status: "TRIALING",
        emailDeliveryStatus: "UNSUBSCRIBED",
        adminOverride: false,
        adminNote: "migrated: was PAUSED",
        trial: true,
      };
    case "PENDING_PREFERENCES":
    default:
      return {
        status: "PENDING_PREFERENCES",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        adminNote: null,
        trial: false,
      };
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  const subscribers = await prisma.subscriber.findMany();

  const counts: Record<string, number> = {};
  let created = 0;
  let skipped = 0;
  let prefsCreated = 0;
  let sendsLinked = 0;
  let feedbacksLinked = 0;

  for (const s of subscribers) {
    const mapped = mapState(s.status, s.email);
    counts[mapped.status] = (counts[mapped.status] ?? 0) + 1;

    if (dryRun) continue;

    // 1. Contact (one per email).
    const contact = await prisma.contact.upsert({
      where: { email: s.email },
      update: {},
      create: { email: s.email, createdAt: s.createdAt },
    });

    // 2. ProductSubscription — skip if already migrated.
    const existing = await prisma.productSubscription.findUnique({
      where: {
        contactId_productKey: {
          contactId: contact.id,
          productKey: ONE_ARTICLE_PRODUCT_KEY,
        },
      },
      include: { preferences: true },
    });
    if (existing) {
      // Already migrated (or created by dual-write). Preserve its status — it
      // may have progressed since — but fill any gaps: backfill missing
      // ArticlePreferences from the legacy row, and re-link existing sends /
      // feedback. This rescues e.g. the founder, whose ADMIN_OVERRIDE row was
      // created by signup/start before it ever had preferences.
      skipped += 1;

      if (!existing.preferences && s.summaryLanguage) {
        await prisma.articlePreferences.create({
          data: {
            productSubscriptionId: existing.id,
            interests: s.interests,
            primaryInterest: s.primaryInterest,
            secondaryInterests: s.secondaryInterests,
            sourceLanguage: s.sourceLanguage,
            summaryLanguage: s.summaryLanguage,
            timezone: s.timezone,
            deliveryHour: s.deliveryHour,
            preferredDifficulty: s.preferredDifficulty,
            recentlySentTopics: s.recentlySentTopics,
            recentlySentArticleIds: s.recentlySentArticleIds,
            feedbackProfile: s.feedbackProfile ?? undefined,
          },
        });
        prefsCreated += 1;
      }

      const linkedSends = await prisma.dailySend.updateMany({
        where: { subscriberId: s.id, productSubscriptionId: null },
        data: { productSubscriptionId: existing.id },
      });
      sendsLinked += linkedSends.count;
      const linkedFb = await prisma.feedback.updateMany({
        where: { subscriberId: s.id, productSubscriptionId: null },
        data: { productSubscriptionId: existing.id },
      });
      feedbacksLinked += linkedFb.count;
      continue;
    }

    const trialStartedAt = mapped.trial ? now : null;
    const trialEndsAt = mapped.trial
      ? new Date(now.getTime() + TRIAL_DAYS * DAY_MS)
      : null;

    const sub = await prisma.productSubscription.create({
      data: {
        contactId: contact.id,
        productKey: ONE_ARTICLE_PRODUCT_KEY,
        status: mapped.status,
        emailDeliveryStatus: mapped.emailDeliveryStatus,
        adminOverride: mapped.adminOverride,
        adminNote: mapped.adminNote,
        trialStartedAt,
        trialEndsAt,
        trialUsedAt: mapped.trial ? now : null,
        // Preserve the legacy plan hint if a (simulated) one was recorded.
        plan: s.billingInterval ?? null,
        lastSentAt: s.lastSentAt,
        createdAt: s.createdAt,
      },
    });
    created += 1;

    // 3. ArticlePreferences from the per-topic fields.
    await prisma.articlePreferences.create({
      data: {
        productSubscriptionId: sub.id,
        interests: s.interests,
        primaryInterest: s.primaryInterest,
        secondaryInterests: s.secondaryInterests,
        sourceLanguage: s.sourceLanguage,
        summaryLanguage: s.summaryLanguage,
        timezone: s.timezone,
        deliveryHour: s.deliveryHour,
        preferredDifficulty: s.preferredDifficulty,
        recentlySentTopics: s.recentlySentTopics,
        recentlySentArticleIds: s.recentlySentArticleIds,
        feedbackProfile: s.feedbackProfile ?? undefined,
      },
    });
    prefsCreated += 1;

    // 4. Re-point existing DailySend / Feedback rows (additive FK).
    const sends = await prisma.dailySend.updateMany({
      where: { subscriberId: s.id, productSubscriptionId: null },
      data: { productSubscriptionId: sub.id },
    });
    sendsLinked += sends.count;

    const fb = await prisma.feedback.updateMany({
      where: { subscriberId: s.id, productSubscriptionId: null },
      data: { productSubscriptionId: sub.id },
    });
    feedbacksLinked += fb.count;
  }

  console.log(`[migrate] mode: ${dryRun ? "DRY-RUN (no writes)" : "APPLY"}`);
  console.log(`[migrate] legacy subscribers scanned: ${subscribers.length}`);
  console.log(`[migrate] status mapping:`, counts);
  if (!dryRun) {
    console.log(`[migrate] subscriptions created: ${created}`);
    console.log(`[migrate] already migrated (skipped): ${skipped}`);
    console.log(`[migrate] preferences created: ${prefsCreated}`);
    console.log(`[migrate] daily sends re-linked: ${sendsLinked}`);
    console.log(`[migrate] feedbacks re-linked: ${feedbacksLinked}`);
  }
}

main()
  .catch((err) => {
    console.error("[migrate] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
