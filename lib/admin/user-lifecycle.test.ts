import { describe, expect, it } from "vitest";
import { analyzeUserJourney, userRole } from "./user-lifecycle";

const baseSubscription = {
  productKey: "one-read",
  status: "PENDING_PREFERENCES",
  paymentProvider: null,
  providerSubscriptionId: null,
  paidAt: null,
  adminOverride: false,
};

describe("analyzeUserJourney", () => {
  it("identifies an email-only unverified lead", () => {
    expect(analyzeUserJourney({
      subscriptions: [],
      verificationRequested: true,
      verified: false,
    })).toMatchObject({
      stage: "UNVERIFIED",
      payment: "NEVER_PAID",
      preferences: "NOT_APPLICABLE",
      verification: "PENDING_VERIFICATION",
    });
  });

  it("identifies a verified user who made no selections", () => {
    expect(analyzeUserJourney({
      subscriptions: [baseSubscription],
      verificationRequested: true,
      verified: true,
    })).toMatchObject({
      stage: "NO_PREFERENCES",
      preferences: "NOT_STARTED",
      missingPreferenceProducts: ["OneArticle"],
    });
  });

  it("identifies partial preferences and a never-paid checkout", () => {
    const result = analyzeUserJourney({
      subscriptions: [
        { ...baseSubscription, status: "PENDING_CHECKOUT" },
        {
          ...baseSubscription,
          productKey: "one-article",
          preferences: { summaryLanguage: "English" },
        },
      ],
      verificationRequested: true,
      verified: true,
    });
    expect(result.stage).toBe("AWAITING_PAYMENT");
    expect(result.payment).toBe("NEVER_PAID");
    expect(result.completedPreferenceProducts).toBe(1);
  });

  it("identifies a fully configured paying user", () => {
    const result = analyzeUserJourney({
      subscriptions: [
        {
          ...baseSubscription,
          status: "ACTIVE_PAID",
          paymentProvider: "polar",
          providerSubscriptionId: "sub_123",
          paidAt: new Date(),
        },
        {
          ...baseSubscription,
          productKey: "one-article",
          preferences: { summaryLanguage: "Turkish" },
        },
      ],
      verificationRequested: true,
      verified: true,
    });
    expect(result).toMatchObject({
      stage: "ACTIVE",
      payment: "PAYING",
      preferences: "COMPLETE",
      hasPaidEver: true,
    });
  });
});

describe("userRole", () => {
  it("matches configured admins case-insensitively", () => {
    expect(userRole("Owner@Example.com", ["owner@example.com"])).toBe("ADMIN");
    expect(userRole("reader@example.com", ["owner@example.com"])).toBe("USER");
  });
});
