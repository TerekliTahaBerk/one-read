import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  contact: vi.fn(), deliveries: vi.fn(), reading: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  contact: { findUnique: mocks.contact },
  oneArticleDelivery: { findMany: mocks.deliveries },
  readingState: { findUnique: mocks.reading },
} }));

import { resolveTodayForContact } from "@/lib/mobile/today";

const now = new Date("2026-08-20T10:00:00.000Z");
const access = { id: "sub", contactId: "c", productKey: "one-read", status: "ACTIVE_PAID", paymentProvider: "polar", adminOverride: false, trialEndsAt: null, currentPeriodEnd: new Date("2026-09-01"), pastDueAt: null, preferences: null };
const holder = { ...access, id: "holder", productKey: "one-article", status: "PENDING_PREFERENCES", paymentProvider: null, preferences: { interests: ["Science"], summaryLanguage: "English" } };
const issue = { id: "i", status: "SENT", scheduledFor: new Date("2026-08-20T04:00:00.000Z"), timezone: "Europe/Istanbul", bodyText: "Useful words", nativeContent: null, createdAt: new Date(), sentAt: new Date(), headline: "Headline", previewText: "Deck", readingLanguage: "English", heroImageUrl: null, heroImageAlt: null, heroImageCredit: null, sourceUrl: null, sourceTitle: null, sourceName: null, ctaLabel: null };

describe("Today resolution", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.reading.mockResolvedValue(null); });
  it("requires complete shared preferences", async () => {
    mocks.contact.mockResolvedValue({ subscriptions: [{ ...holder, preferences: null }] });
    expect((await resolveTodayForContact("c", now)).state).toBe("ACCOUNT_INCOMPLETE");
  });
  it("requires provider-confirmed access independently of email status", async () => {
    mocks.contact.mockResolvedValue({ subscriptions: [holder, { ...access, status: "EXPIRED" }] });
    expect((await resolveTodayForContact("c", now)).state).toBe("SUBSCRIPTION_REQUIRED");
  });
  it("never exposes a draft", async () => {
    mocks.contact.mockResolvedValue({ subscriptions: [holder, { ...access, emailDeliveryStatus: "UNSUBSCRIBED" }] });
    mocks.deliveries.mockResolvedValue([{ issueId: "i", status: "SENT", issue: { ...issue, status: "DRAFT" } }]);
    expect((await resolveTodayForContact("c", now)).state).toBe("NO_EDITION");
  });
  it("keeps a published issue readable after email delivery failure", async () => {
    mocks.contact.mockResolvedValue({ subscriptions: [holder, { ...access, emailDeliveryStatus: "SUPPRESSED" }] });
    mocks.deliveries.mockResolvedValue([{ issueId: "i", status: "FAILED", issue }]);
    expect((await resolveTodayForContact("c", now)).state).toBe("DELIVERY_FAILED_BUT_READABLE");
  });
  it("does not reveal a future issue", async () => {
    mocks.contact.mockResolvedValue({ subscriptions: [holder, access] });
    mocks.deliveries.mockResolvedValue([{ issueId: "i", status: "QUEUED", issue: { ...issue, scheduledFor: new Date("2026-08-20T15:00:00.000Z"), status: "SCHEDULED" } }]);
    expect((await resolveTodayForContact("c", now)).state).toBe("UPCOMING");
  });
  it("returns READ after completion", async () => {
    mocks.contact.mockResolvedValue({ subscriptions: [holder, access] }); mocks.deliveries.mockResolvedValue([{ issueId: "i", status: "SENT", issue }]); mocks.reading.mockResolvedValue({ progress: 92, completedAt: new Date() });
    expect((await resolveTodayForContact("c", now)).state).toBe("READ");
  });
});
