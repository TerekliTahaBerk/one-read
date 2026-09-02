import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  dispatchDueOneNewsIssues,
  dispatchOneNewsIssue,
  PROVIDER_IDEMPOTENCY_TTL_MS,
  retryFailedOneNewsIssue,
} from "@/lib/one-news/delivery";

const marker = `c4-${process.pid}`;
const contactIds: string[] = [];
const body = Array.from({ length: 130 }, (_, index) => `verified-${index}`).join(" ");

async function fixture(suffix: string, scheduled = true) {
  const contact = await prisma.contact.create({ data: { email: `${marker}-${suffix}@example.test` } });
  contactIds.push(contact.id);
  const subscription = await prisma.productSubscription.create({
    data: {
      contactId: contact.id,
      productKey: "one-news",
      offerKey: "one-news",
      status: "ADMIN_OVERRIDE",
      adminOverride: true,
      preferences: { create: {
        interests: ["Technology"], secondaryInterests: [], recentlySentTopics: [],
        recentlySentArticleIds: [], summaryLanguage: "English",
      } },
    },
  });
  const issue = await prisma.oneNewsIssue.create({
    data: {
      readingLanguage: "English", status: scheduled ? "SCHEDULED" : "DRAFT",
      scheduledFor: scheduled ? new Date(Date.now() - 1_000) : null,
      scheduledAt: scheduled ? new Date() : null, readyAt: new Date(),
      subject: "OneNews integration edition", headline: "A verified story", dek: "The useful context.",
      whatHappened: body, whyItMatters: body, whatToWatch: body,
      createdBy: marker, updatedBy: marker,
      sources: { create: [
        { url: "https://primary.example.test/report", title: "Primary record", publication: "Primary", sourceType: "PRIMARY", sortOrder: 0 },
        { url: "https://reporting.example.test/story", title: "Independent report", publication: "Reporter", sourceType: "REPORTING", sortOrder: 1 },
      ] },
    },
  });
  return { contact, subscription, issue };
}

beforeAll(() => prisma.$connect());
afterAll(async () => {
  await prisma.oneNewsIssue.deleteMany({ where: { createdBy: marker } });
  await prisma.contact.deleteMany({ where: { id: { in: contactIds } } });
  await prisma.$disconnect();
});

describe("database-backed OneNews reliability", () => {
  it("claims concurrent and sequential cron exactly once", async () => {
    const { issue } = await fixture("concurrent");
    const calls: string[] = [];
    const send = async ({ idempotencyKey }: { idempotencyKey?: string }) => {
      calls.push(idempotencyKey ?? ""); return { messageId: "news-provider-1" };
    };
    await Promise.all([dispatchDueOneNewsIssues(new Date(), { send }), dispatchDueOneNewsIssues(new Date(), { send })]);
    await dispatchDueOneNewsIssues(new Date(), { send });
    expect(await prisma.oneNewsDelivery.count({ where: { issueId: issue.id } })).toBe(1);
    expect(calls).toEqual([`onenews-${issue.id}-${contactIds[0]}`]);
  });

  it("isolates partial failure and rechecks product opt-out before retry", async () => {
    const first = await fixture("partial-a");
    const second = await fixture("partial-b", false);
    await dispatchDueOneNewsIssues(new Date(), { send: async ({ to }) => {
      if (to.includes("partial-b")) throw new Error("provider unavailable");
      return { messageId: "accepted" };
    } });
    expect((await prisma.oneNewsIssue.findUniqueOrThrow({ where: { id: first.issue.id } })).status).toBe("PARTIALLY_FAILED");
    await retryFailedOneNewsIssue(first.issue.id, "operator@example.test");
    await prisma.productSubscription.update({ where: { id: second.subscription.id }, data: { emailDeliveryStatus: "UNSUBSCRIBED" } });
    const calls: string[] = [];
    await dispatchDueOneNewsIssues(new Date(), { send: async ({ to }) => { calls.push(to); return {}; } });
    expect(calls.some((email) => email.includes("partial-b"))).toBe(false);
    expect((await prisma.oneNewsDelivery.findFirstOrThrow({ where: { issueId: first.issue.id, contactId: second.contact.id } })).status).toBe("SKIPPED");
  });

  it("recovers provider acceptance only inside the shared idempotency window", async () => {
    const { issue } = await fixture("accepted-db-fail");
    const keys: string[] = [];
    let inject = true;
    const send = async ({ idempotencyKey }: { idempotencyKey?: string }) => { keys.push(idempotencyKey ?? ""); return { messageId: "same-id" }; };
    await dispatchDueOneNewsIssues(new Date(), { send, afterProviderAccepted: () => {
      if (inject) { inject = false; throw new Error("injected persistence failure"); }
    } });
    const row = await prisma.oneNewsDelivery.findFirstOrThrow({ where: { issueId: issue.id } });
    await prisma.oneNewsIssue.update({ where: { id: issue.id }, data: { status: "SENDING" } });
    await dispatchOneNewsIssue(issue.id, { now: new Date(row.lastAttemptAt!.getTime() + 1_000), send });
    const targetKeys = keys.filter((key) => key.includes(row.contactId));
    expect(targetKeys).toHaveLength(2);
    expect(new Set(targetKeys).size).toBe(1);
  });

  it("blocks an ambiguous send after the provider window", async () => {
    const { issue, contact, subscription } = await fixture("stale", false);
    const old = new Date(Date.now() - PROVIDER_IDEMPOTENCY_TTL_MS - 1_000);
    await prisma.oneNewsIssue.update({ where: { id: issue.id }, data: { status: "SENDING", scheduledFor: old } });
    await prisma.oneNewsDelivery.create({ data: {
      issueId: issue.id, contactId: contact.id, productSubscriptionId: subscription.id,
      status: "SENDING", attemptCount: 1, lastAttemptAt: old, providerAcceptedAt: old,
    } });
    const sends: string[] = [];
    await dispatchOneNewsIssue(issue.id, { send: async ({ to }) => { sends.push(to); return {}; } });
    expect(sends.some((email) => email.includes("-stale@"))).toBe(false);
    expect((await prisma.oneNewsDelivery.findFirstOrThrow({ where: { issueId: issue.id, contactId: contact.id } })).status).toBe("RECONCILIATION_REQUIRED");
  });
});
