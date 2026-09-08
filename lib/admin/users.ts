import { articlePreferenceFields, parseProductTopics } from "@/lib/product-preferences";
import { prisma } from "@/lib/prisma";
import {
  ensureOneArticleSubscription,
} from "@/lib/subscriptions";
import {
  parseEmail,
  parseSummaryLanguage,
} from "@/lib/options";
import { createPolarCustomerPortalUrl } from "@/lib/billing/polar";

/**
 * Mutating admin actions on a OneArticle subscription. Each is intentionally
 * narrow and conservative:
 *   - email-delivery actions never silently change billing/access,
 *   - SUPPRESSED (hard bounce) is only cleared by an explicit unsuppress,
 *   - removing an admin override never keeps or grants access.
 *
 * Callers (API routes) own auth and audit logging; these helpers just do the
 * data change and report a structured result.
 */
export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Set by actions that hand the operator somewhere to go, not a mutation. */
  url?: string;
}

async function loadSub(subId: string) {
  return prisma.productSubscription.findUnique({ where: { id: subId } });
}

/** Pause email delivery (user keeps their access/billing untouched). */
export async function pauseEmails(subId: string): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };
  if (sub.emailDeliveryStatus === "SUPPRESSED") {
    return { ok: false, error: "suppressed_cannot_pause" };
  }
  await prisma.productSubscription.update({
    where: { id: subId },
    data: { emailDeliveryStatus: "UNSUBSCRIBED" },
  });
  return { ok: true };
}

/** Resume email delivery. Leaves SUPPRESSED alone — that needs unsuppress. */
export async function resumeEmails(subId: string): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };
  if (sub.emailDeliveryStatus === "SUPPRESSED") {
    return { ok: false, error: "suppressed_use_unsuppress" };
  }
  await prisma.productSubscription.update({
    where: { id: subId },
    data: { emailDeliveryStatus: "SUBSCRIBED" },
  });
  return { ok: true };
}

/** Hard-bounce suppression — blocks all delivery until deliberately cleared. */
export async function suppressUser(subId: string): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };
  await prisma.productSubscription.update({
    where: { id: subId },
    data: { emailDeliveryStatus: "SUPPRESSED" },
  });
  return { ok: true };
}

/** Clear a suppression, returning the subscriber to SUBSCRIBED. */
export async function unsuppressUser(subId: string): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };
  await prisma.productSubscription.update({
    where: { id: subId },
    data: { emailDeliveryStatus: "SUBSCRIBED" },
  });
  return { ok: true };
}

/**
 * Grant access via admin override. This is the only path that intentionally
 * makes a non-paying subscriber eligible — gated behind explicit confirmation
 * in the UI.
 */
export async function setAdminOverride(
  subId: string,
  note?: string,
): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };
  await prisma.productSubscription.update({
    where: { id: subId },
    data: {
      adminOverride: true,
      status: "ADMIN_OVERRIDE",
      adminNote: note ?? sub.adminNote ?? "admin override",
    },
  });
  return { ok: true };
}

/**
 * Remove an admin override. Conservative by design: it never keeps or grants
 * access. If the subscription was sitting in ADMIN_OVERRIDE, it drops to
 * PENDING_CHECKOUT (a non-granting state); a real Polar webhook will move it
 * back to a paid state if the customer actually has one.
 */
export async function removeAdminOverride(subId: string): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };
  const nextStatus = sub.status === "ADMIN_OVERRIDE" ? "PENDING_CHECKOUT" : sub.status;
  await prisma.productSubscription.update({
    where: { id: subId },
    data: { adminOverride: false, status: nextStatus },
  });
  return { ok: true };
}

/** Free-text admin note (cleared with an empty string). */
export async function setAdminNote(subId: string, note: string): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };
  await prisma.productSubscription.update({
    where: { id: subId },
    data: { adminNote: note.trim() ? note.trim() : null },
  });
  return { ok: true };
}

/**
 * Update OneArticle preferences from the admin. Validates against the same
 * option parsers the public signup uses, then reuses upsertArticlePreferences.
 */
export async function updatePreferences(
  subId: string,
  raw: {
    summaryLanguage?: unknown;
    topics?: unknown;
  },
): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "not_found" };

  const summaryLanguage = parseSummaryLanguage(raw.summaryLanguage);
  if (!summaryLanguage) return { ok: false, error: "invalid_summary_language" };

  const topics = raw.topics === undefined ? undefined : parseProductTopics(raw.topics);
  if (topics === null) return { ok: false, error: "invalid_topics" };
  if (sub.productKey === "one-news") {
    await prisma.oneNewsPreferences.upsert({ where: { productSubscriptionId: subId },
      update: { summaryLanguage, ...(topics ? { topics } : {}) },
      create: { productSubscriptionId: subId, summaryLanguage, topics: topics ?? [] } });
  } else if (sub.productKey === "one-article") {
    const fields = topics ? articlePreferenceFields({ topics, summaryLanguage }) : { summaryLanguage };
    await prisma.articlePreferences.upsert({ where: { productSubscriptionId: subId }, update: fields,
      create: { productSubscriptionId: subId, interests: [], secondaryInterests: [], sourceLanguage: "Any", ...fields } });
  } else return { ok: false, error: "unsupported_product" };
  return { ok: true };
}

/** Create (or find) a contact + OneArticle subscription for an email. */
export async function createUser(
  rawEmail: unknown,
): Promise<ActionResult & { subId?: string }> {
  const email = parseEmail(rawEmail);
  if (!email) return { ok: false, error: "invalid_email" };
  const sub = await ensureOneArticleSubscription(email);
  return { ok: true, subId: sub.id };
}

/**
 * Hard delete — only for test fixtures. Refuses unless the typed email matches
 * the record AND the email looks like a test/mock address. Everything else
 * should use suppress/pause, never destructive deletes.
 */
const TEST_EMAIL_PATTERN = /(@example\.com|^mock-fixture-|@test\.|@example\.org)/i;

export async function hardDeleteTestUser(
  subId: string,
  typedEmail: string,
): Promise<ActionResult> {
  const sub = await prisma.productSubscription.findUnique({
    where: { id: subId },
    include: { contact: true },
  });
  if (!sub) return { ok: false, error: "not_found" };
  if (sub.contact.email !== typedEmail.trim().toLowerCase()) {
    return { ok: false, error: "email_mismatch" };
  }
  if (!TEST_EMAIL_PATTERN.test(sub.contact.email)) {
    return { ok: false, error: "not_a_test_user" };
  }
  // Cascades to subscriptions, preferences, sends, feedback for this contact.
  await prisma.contact.delete({ where: { id: sub.contactId } });
  return { ok: true };
}

/**
 * A Polar customer-portal session for one subscription.
 *
 * This is support access to a real person's billing account, so it is
 * deliberately narrow: it resolves the portal for the *given* subscription
 * rather than searching the contact for any Polar row, it never emails the
 * link anywhere, and the caller audits it. The portal itself can cancel a
 * subscription, which is why the panel confirms before opening one.
 */
export async function openBillingPortal(subId: string): Promise<ActionResult> {
  const sub = await loadSub(subId);
  if (!sub) return { ok: false, error: "subscription_not_found" };
  if (sub.paymentProvider !== "polar") return { ok: false, error: "not_a_polar_subscription" };
  if (!sub.providerCustomerId && !sub.providerSubscriptionId) {
    return { ok: false, error: "no_billing_account" };
  }
  try {
    const url = await createPolarCustomerPortalUrl(sub, sub.productKey);
    return { ok: true, url };
  } catch (error) {
    console.error("[admin/users] billing portal failed:", error);
    return { ok: false, error: "billing_portal_unavailable" };
  }
}
