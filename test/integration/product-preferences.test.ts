import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveProductPreferences, offerPreferencesComplete } from "@/lib/oneread/product-preferences";
import { dispatchDueOneNewsIssues, dispatchOneNewsIssue, eligibleOneNewsRecipients, PROVIDER_IDEMPOTENCY_TTL_MS } from "@/lib/one-news/delivery";
import { scheduleOneNewsIssue } from "@/lib/one-news/editorial";
import { sampleOneNewsContent, sampleOneNewsSources } from "@/lib/one-news/fixtures";
import { dispatchDueEditorialIssues, scheduleEditorialIssue } from "@/lib/one-article/editorial";
const marker = `prefs-${process.pid}`;
const contacts: string[] = [];
const slots: string[] = [];
async function reader(suffix: string, offer = "one-read", status = "ADMIN_OVERRIDE") {
  const contact = await prisma.contact.create({ data: { email: `${marker}-${suffix}@example.test` } }); contacts.push(contact.id);
  const billing = await prisma.productSubscription.create({ data: { contactId: contact.id, productKey: offer, offerKey: offer, status, adminOverride: status === "ADMIN_OVERRIDE" } });
  return { contact, billing };
}
async function slot(language = "Turkish") {
  const publication = new Date(Date.now() - 1000);
  const group = await prisma.oneNewsPublicationSlot.create({ data: { publicationAt: publication, readingLanguage: language } }); slots.push(group.id);
  const issues = [];
  for (const [rank, topic] of ["business", "science", "design"].entries()) {
    const content = sampleOneNewsContent({ readingLanguage: language });
    issues.push(await prisma.oneNewsIssue.create({ data: {
      ...content, slotId: group.id, editorialRank: rank, topic, readingLanguage: language,
      status: "SCHEDULED", scheduledFor: publication, readyAt: new Date(), createdBy: marker, updatedBy: marker,
      sources: { create: sampleOneNewsSources().map((source, sortOrder) => ({ ...source, sortOrder })) },
    } }));
  }
  return { group, issues };
}
afterEach(async () => {
  await prisma.oneNewsIssue.deleteMany({ where: { createdBy: marker } });
  await prisma.oneArticleIssue.deleteMany({ where: { createdBy: marker } });
  await prisma.oneNewsPublicationSlot.deleteMany({ where: { id: { in: slots } } });
  await prisma.contact.deleteMany({ where: { id: { in: contacts } } });
});

describe("real database product preferences and candidate delivery", () => {
  it("backfills legacy news language once without overwriting article history or email state", async () => {
    const { contact, billing } = await reader("backfill");
    await prisma.productSubscription.update({ where: { id: billing.id }, data: { emailDeliveryStatus: "UNSUBSCRIBED" } });
    await saveProductPreferences(contact.id, "one-article", { topics: ["science"], summaryLanguage: "German" });
    const before = await prisma.articlePreferences.findFirstOrThrow({ where: { subscription: { contactId: contact.id } } });
    const sql = readFileSync("prisma/migrations/20260908120000_product_editorial_preferences/migration.sql", "utf8");
    const backfill = sql.slice(sql.indexOf('-- Snapshot historical'), sql.indexOf('ALTER TABLE "OneNewsIssue" ADD CONSTRAINT "OneNewsIssue_editorialRank_check"'));
    for (const statement of backfill.split(";").filter((part) => part.trim())) await prisma.$executeRawUnsafe(statement);
    const news = await prisma.productSubscription.findUniqueOrThrow({ where: { contactId_productKey: { contactId: contact.id, productKey: "one-news" } }, include: { newsPreferences: true } });
    expect(news).toMatchObject({ emailDeliveryStatus: "UNSUBSCRIBED", newsPreferences: { topics: [], summaryLanguage: "German" } });
    expect(news.unsubscribeToken).not.toContain(billing.unsubscribeToken);
    await saveProductPreferences(contact.id, "one-article", { topics: ["design"], summaryLanguage: "English" });
    expect((await prisma.oneNewsPreferences.findUniqueOrThrow({ where: { productSubscriptionId: news.id } })).summaryLanguage).toBe("German");
    expect(before).toMatchObject({ primaryInterest: "science", summaryLanguage: "German" });
  });

  it("persists bundle preferences independently without changing billing/email/history", async () => {
    const { contact, billing } = await reader("independence");
    await saveProductPreferences(contact.id, "one-article", { topics: ["science", "design"], summaryLanguage: "English" });
    expect(await offerPreferencesComplete(contact.email, "one-read")).toBe(false);
    await saveProductPreferences(contact.id, "one-news", { topics: ["business"], summaryLanguage: "Turkish" });
    expect(await offerPreferencesComplete(contact.email, "one-read")).toBe(true);
    const news = await prisma.productSubscription.findUniqueOrThrow({ where: { contactId_productKey: { contactId: contact.id, productKey: "one-news" } } });
    await prisma.productSubscription.update({ where: { id: news.id }, data: { emailDeliveryStatus: "UNSUBSCRIBED" } });
    await saveProductPreferences(contact.id, "one-news", { topics: ["design"], summaryLanguage: "German" });
    expect(await prisma.productSubscription.findUnique({ where: { id: billing.id } })).toEqual(billing);
    expect((await prisma.productSubscription.findUniqueOrThrow({ where: { id: news.id } })).emailDeliveryStatus).toBe("UNSUBSCRIBED");
    const article = await prisma.productSubscription.findUniqueOrThrow({ where: { contactId_productKey: { contactId: contact.id, productKey: "one-article" } }, include: { preferences: true } });
    expect(article.preferences).toMatchObject({ summaryLanguage: "English", primaryInterest: "science", secondaryInterests: ["design"] });
    await prisma.articlePreferences.update({ where: { productSubscriptionId: article.id }, data: { sourceLanguage: "French", recentlySentTopics: ["health"] } });
    await saveProductPreferences(contact.id, "one-article", { topics: ["design"], summaryLanguage: "French" });
    expect(await prisma.articlePreferences.findUnique({ where: { productSubscriptionId: article.id } })).toMatchObject({ sourceLanguage: "French", recentlySentTopics: ["health"] });
  });

  it("chooses primary, secondary, fallback, and correct product language with one send per slot under concurrency", async () => {
    const primary = await reader("primary"); const secondary = await reader("secondary"); const fallback = await reader("fallback");
    const legacy = await reader("legacy", "one-news"); const off = await reader("off"); const denied = await reader("denied", "one-news", "PENDING_CHECKOUT");
    for (const r of [primary, secondary, fallback, off, denied]) await saveProductPreferences(r.contact.id, "one-news", { topics: r === primary ? ["design", "science"] : r === secondary ? ["health", "science"] : ["health"], summaryLanguage: "Turkish" });
    await saveProductPreferences(primary.contact.id, "one-article", { topics: ["business"], summaryLanguage: "English" });
    await prisma.productSubscription.updateMany({ where: { contactId: off.contact.id, productKey: "one-news" }, data: { emailDeliveryStatus: "UNSUBSCRIBED" } });
    const { group, issues } = await slot();
    const english = await slot("English");
    const calls: { to: string; key?: string }[] = [];
    const send = async ({ to, idempotencyKey }: { to: string; idempotencyKey?: string }) => { calls.push({ to, key: idempotencyKey }); return { messageId: "accepted" }; };
    await Promise.all([dispatchDueOneNewsIssues(new Date(), { send }), dispatchDueOneNewsIssues(new Date(), { send })]);
    await dispatchDueOneNewsIssues(new Date(), { send });
    const deliveries = await prisma.oneNewsDelivery.findMany({ where: { slotId: group.id } });
    expect(deliveries.find((d) => d.contactId === primary.contact.id)?.issueId).toBe(issues[2].id);
    expect(deliveries.find((d) => d.contactId === secondary.contact.id)?.issueId).toBe(issues[1].id);
    expect(deliveries.find((d) => d.contactId === fallback.contact.id)?.issueId).toBe(issues[0].id);
    expect(deliveries).toHaveLength(3);
    expect(calls.filter((c) => c.to === primary.contact.email)).toHaveLength(1);
    expect(calls.some((c) => c.to === off.contact.email || c.to === denied.contact.email)).toBe(false);
    expect(await prisma.oneNewsDelivery.findFirst({ where: { contactId: legacy.contact.id, slotId: english.group.id } })).toMatchObject({ issueId: english.issues[0].id, status: "SENT" });
    expect(await eligibleOneNewsRecipients("English")).not.toEqual(expect.arrayContaining([expect.objectContaining({ contact: { id: primary.contact.id, email: primary.contact.email } })]));
    // A second selected issue cannot create a second recipient/slot record.
    await expect(prisma.oneNewsDelivery.create({ data: { slotId: group.id, issueId: issues[0].id, contactId: primary.contact.id, productSubscriptionId: deliveries[0].productSubscriptionId } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("pins the selected story and provider key across a crash and preference edit; expires the original idempotency window", async () => {
    const { contact } = await reader("retry");
    await saveProductPreferences(contact.id, "one-news", { topics: ["science"], summaryLanguage: "Turkish" });
    const { group, issues } = await slot();
    const calls: string[] = [];
    const send = async ({ idempotencyKey }: { idempotencyKey?: string }) => { calls.push(idempotencyKey!); return { messageId: "same-message" }; };
    await dispatchDueOneNewsIssues(new Date(), { send, afterProviderAccepted: () => { throw new Error("crash"); } });
    await saveProductPreferences(contact.id, "one-news", { topics: ["design"], summaryLanguage: "Turkish" });
    const row = await prisma.oneNewsDelivery.findUniqueOrThrow({ where: { slotId_contactId: { slotId: group.id, contactId: contact.id } } });
    await prisma.oneNewsIssue.update({ where: { id: issues[0].id }, data: { status: "SENDING" } });
    await dispatchOneNewsIssue(issues[0].id, { now: new Date(row.lastAttemptAt!.getTime() + 16 * 60 * 1000), send, afterProviderAccepted: () => { throw new Error("crash again"); } });
    expect(calls).toEqual([`onenews-${group.id}-${contact.id}`, `onenews-${group.id}-${contact.id}`]);
    expect((await prisma.oneNewsDelivery.findUniqueOrThrow({ where: { id: row.id } })).issueId).toBe(issues[1].id);
    await prisma.oneNewsIssue.update({ where: { id: issues[0].id }, data: { status: "SENDING" } });
    await dispatchOneNewsIssue(issues[0].id, { now: new Date(row.firstAttemptAt!.getTime() + PROVIDER_IDEMPOTENCY_TTL_MS + 1), send });
    expect(calls).toHaveLength(2);
    expect((await prisma.oneNewsDelivery.findUniqueOrThrow({ where: { id: row.id } })).status).toBe("RECONCILIATION_REQUIRED");
  });

  it("requires a lead before secondary scheduling and freezes a dispatched slot", async () => {
    const { group, issues } = await slot();
    const future = new Date(Date.now() + 60_000);
    await prisma.oneNewsIssue.update({ where: { id: issues[1].id }, data: { status: "READY", slotId: null } });
    await expect(scheduleOneNewsIssue({ id: issues[1].id, scheduledFor: future, editorialRank: 1, actor: "editor@example.test" })).rejects.toThrow("schedule_editorial_lead_first");
    await prisma.oneNewsPublicationSlot.update({ where: { id: group.id }, data: { publicationAt: future, sealedAt: new Date() } });
    await expect(scheduleOneNewsIssue({ id: issues[1].id, scheduledFor: future, editorialRank: 1, actor: "editor@example.test" })).rejects.toThrow("slot_already_dispatching");
  });

  it("uses article preferences in the actual approved-edition dispatcher", async () => {
    const { contact } = await reader("article", "one-article");
    await saveProductPreferences(contact.id, "one-article", { topics: ["design", "science"], summaryLanguage: "English" });
    const publication = new Date();
    publication.setUTCDate(publication.getUTCDate() + ((3 - publication.getUTCDay() + 7) % 7 || 7));
    publication.setUTCHours(7, 0, 0, 0);
    const bodyText = Array.from({ length: 180 }, () => "A useful verified explanation.").join(" ");
    const issues = [];
    for (const topic of ["business", "science", "design"]) {
      const issue = await prisma.oneArticleIssue.create({ data: { readingLanguage: "English", subject: topic, headline: `A useful ${topic} story`, bodyText, status: "READY", readyAt: new Date(), topics: [topic], sourceTitle: "Verified source", sourceUrl: "https://example.test/source", createdBy: marker, updatedBy: marker } });
      issues.push(await scheduleEditorialIssue({ id: issue.id, scheduledFor: publication, actor: "editor@example.test" }));
    }
    const calls: string[] = [];
    await dispatchDueEditorialIssues(publication, { send: async ({ subject }) => { calls.push(subject); return {}; } });
    const rows = await prisma.oneArticleDelivery.findMany({ where: { contactId: contact.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ issueId: issues[2].id, status: "SENT" });
    expect(calls).toHaveLength(1);
  });
});
