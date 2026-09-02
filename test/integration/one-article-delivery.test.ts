import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  dispatchDueEditorialIssues,
  dispatchIssue,
  PROVIDER_IDEMPOTENCY_TTL_MS,
  retryEditorialIssue,
  type EditorialDispatchOptions,
} from "@/lib/one-article/editorial";

const prefix = `milestone-a-${process.pid}-`;
const contacts: string[] = [];

async function fixture(emailSuffix: string, scheduled = true) {
  const contact = await prisma.contact.create({ data: { email: `${prefix}${emailSuffix}@example.test` } });
  contacts.push(contact.id);
  const subscription = await prisma.productSubscription.create({
    data: {
      contactId: contact.id,
      productKey: "one-article",
      status: "ADMIN_OVERRIDE",
      adminOverride: true,
      preferences: {
        create: {
          interests: ["Technology"],
          secondaryInterests: [],
          recentlySentTopics: [],
          recentlySentArticleIds: [],
          summaryLanguage: "English",
        },
      },
    },
  });
  const issue = await prisma.oneArticleIssue.create({
    data: {
      readingLanguage: "English",
      status: scheduled ? "SCHEDULED" : "DRAFT",
      scheduledFor: scheduled ? new Date(Date.now() - 1_000) : null,
      subject: "A safe edition",
      headline: "One useful idea",
      bodyText: "A sufficiently complete editorial body for database-backed dispatch testing.",
      sourceTitle: "Source",
      sourceUrl: "https://example.test/source",
      createdBy: "integration-test",
      updatedBy: "integration-test",
    },
  });
  return { contact, subscription, issue };
}

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.oneArticleIssue.deleteMany({ where: { createdBy: "integration-test" } });
  await prisma.contact.deleteMany({ where: { id: { in: contacts } } });
  await prisma.$disconnect();
});

describe("database-backed OneArticle delivery", () => {
  it("claims overlapping and repeated cron dispatch exactly once", async () => {
    const { issue } = await fixture("concurrent");
    const calls: string[] = [];
    const send = async ({ idempotencyKey }: { idempotencyKey?: string }) => {
      calls.push(idempotencyKey ?? "");
      return { messageId: "provider-1" };
    };
    await Promise.all([
      dispatchDueEditorialIssues(new Date(), { send }),
      dispatchDueEditorialIssues(new Date(), { send }),
    ]);
    await dispatchDueEditorialIssues(new Date(), { send });
    const rows = await prisma.oneArticleDelivery.findMany({ where: { issueId: issue.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("SENT");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain(issue.id);
  });

  it("records partial failure and retries only the failed recipient", async () => {
    const first = await fixture("partial-a");
    const second = await fixture("partial-b", false);
    await prisma.productSubscription.update({ where: { id: second.subscription.id }, data: {} });
    await prisma.oneArticleDelivery.create({
      data: { issueId: first.issue.id, contactId: second.contact.id, productSubscriptionId: second.subscription.id },
    });
    const sent: string[] = [];
    await dispatchIssue(first.issue.id, { send: async ({ to }) => {
      if (to.includes("partial-b")) throw new Error("provider unavailable");
      sent.push(to); return { messageId: "ok" };
    }});
    expect((await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id: first.issue.id } })).status).toBe("PARTIALLY_FAILED");
    await retryEditorialIssue(first.issue.id, "operator@example.test");
    await dispatchDueEditorialIssues(new Date(), { send: async ({ to }) => { sent.push(to); return { messageId: "retry" }; } });
    expect(sent.filter((email) => email.includes("partial-a"))).toHaveLength(1);
  });

  it("re-checks suppression before a failed delivery retry", async () => {
    const { issue, subscription } = await fixture("suppressed");
    await dispatchDueEditorialIssues(new Date(), { send: async () => { throw new Error("temporary"); } });
    await retryEditorialIssue(issue.id, "operator@example.test");
    await prisma.productSubscription.update({ where: { id: subscription.id }, data: { emailDeliveryStatus: "SUPPRESSED" } });
    const sends: string[] = [];
    await dispatchDueEditorialIssues(new Date(), { send: async ({ to }) => { sends.push(to); return {}; } });
    expect(sends.filter((email) => email.includes("suppressed"))).toHaveLength(0);
    expect((await prisma.oneArticleDelivery.findFirstOrThrow({ where: { issueId: issue.id, productSubscriptionId: subscription.id } })).status).toBe("SKIPPED");
  });

  it("re-checks unsubscribe before retry and provides operator recovery after exhaustion", async () => {
    const { issue, subscription } = await fixture("unsubscribed");
    await dispatchDueEditorialIssues(new Date(), { send: async ({ to }) => {
      if (to.includes("unsubscribed")) throw new Error("temporary");
      return { messageId: "other" };
    }});
    await retryEditorialIssue(issue.id, "operator@example.test");
    await prisma.productSubscription.update({ where: { id: subscription.id }, data: { emailDeliveryStatus: "UNSUBSCRIBED" } });
    const sent: string[] = [];
    await dispatchDueEditorialIssues(new Date(), { send: async ({ to }) => { sent.push(to); return {}; } });
    expect(sent.filter((email) => email.includes("unsubscribed"))).toHaveLength(0);

    const exhausted = await fixture("exhausted", false);
    await prisma.oneArticleDelivery.create({ data: {
      issueId: exhausted.issue.id,
      contactId: exhausted.contact.id,
      productSubscriptionId: exhausted.subscription.id,
      status: "FAILED",
      attemptCount: 3,
    }});
    await prisma.oneArticleIssue.update({ where: { id: exhausted.issue.id }, data: { status: "FAILED" } });
    await retryEditorialIssue(exhausted.issue.id, "operator@example.test");
    const reset = await prisma.oneArticleDelivery.findFirstOrThrow({ where: { issueId: exhausted.issue.id, contactId: exhausted.contact.id } });
    expect(reset.attemptCount).toBe(0);
    expect(reset.manualRecoveryBy).toBe("operator@example.test");
    await prisma.oneArticleIssue.update({ where: { id: exhausted.issue.id }, data: { status: "CANCELED" } });
  });

  it("recovers provider acceptance inside the idempotency window", async () => {
    const { issue } = await fixture("ambiguous-safe");
    const calls: string[] = [];
    const send: NonNullable<EditorialDispatchOptions["send"]> = async ({ to }) => { calls.push(to); return { messageId: "same-provider-id" }; };
    await dispatchDueEditorialIssues(new Date(), { send, afterProviderAccepted: () => { throw new Error("injected db boundary failure"); } });
    const ambiguous = await prisma.oneArticleDelivery.findFirstOrThrow({ where: { issueId: issue.id } });
    expect(ambiguous.status).toBe("SENDING");
    await prisma.oneArticleIssue.update({ where: { id: issue.id }, data: { status: "SENDING" } });
    await dispatchIssue(issue.id, { send, now: new Date(ambiguous.lastAttemptAt!.getTime() + 1_000) });
    expect(calls.filter((email) => email.includes("ambiguous-safe"))).toHaveLength(2);
    expect((await prisma.oneArticleDelivery.findUniqueOrThrow({ where: { id: ambiguous.id } })).status).toBe("SENT");
  });

  it("does not resend an ambiguous delivery outside the provider window", async () => {
    const { issue, contact, subscription } = await fixture("ambiguous-stale", false);
    const old = new Date(Date.now() - PROVIDER_IDEMPOTENCY_TTL_MS - 1_000);
    await prisma.oneArticleDelivery.create({ data: { issueId: issue.id, contactId: contact.id, productSubscriptionId: subscription.id, status: "SENDING", attemptCount: 1, lastAttemptAt: old, providerAcceptedAt: old } });
    const sends: string[] = [];
    await dispatchIssue(issue.id, { send: async ({ to }) => { sends.push(to); return {}; } });
    expect(sends.filter((email) => email.includes("ambiguous-stale"))).toHaveLength(0);
    expect((await prisma.oneArticleDelivery.findFirstOrThrow({ where: { issueId: issue.id, contactId: contact.id } })).status).toBe("RECONCILIATION_REQUIRED");
  });
});
