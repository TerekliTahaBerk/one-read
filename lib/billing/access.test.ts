import { afterEach, describe, expect, it } from "vitest";
import { hasValidAccess } from "@/lib/billing/access";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

const now = new Date("2026-07-30T12:00:00.000Z");
const base = {
  status: "PENDING_CHECKOUT",
  paymentProvider: null,
  adminOverride: false,
  trialEndsAt: null,
  currentPeriodEnd: null,
  pastDueAt: null,
};

describe("hasValidAccess", () => {
  it("grants admin-comped access without a payment provider", () => {
    expect(
      hasValidAccess({ ...base, status: "ADMIN_OVERRIDE", adminOverride: true }, now),
    ).toEqual({ allowed: true, reason: "ok" });
  });

  it("requires provider confirmation for active paid status", () => {
    expect(hasValidAccess({ ...base, status: "ACTIVE_PAID" }, now)).toEqual({
      allowed: false,
      reason: "subscription_not_confirmed",
    });
    expect(
      hasValidAccess({ ...base, status: "ACTIVE_PAID", paymentProvider: "polar" }, now),
    ).toEqual({ allowed: true, reason: "ok" });
  });

  it("allows a current Polar trial and expires an ended trial", () => {
    expect(
      hasValidAccess(
        {
          ...base,
          status: "TRIALING",
          paymentProvider: "polar",
          trialEndsAt: new Date("2026-07-31T12:00:00.000Z"),
        },
        now,
      ),
    ).toEqual({ allowed: true, reason: "ok" });
    expect(
      hasValidAccess(
        {
          ...base,
          status: "TRIALING",
          paymentProvider: "polar",
          trialEndsAt: new Date("2026-07-29T12:00:00.000Z"),
        },
        now,
      ),
    ).toEqual({ allowed: false, reason: "trial_expired" });
  });

  it("keeps canceled access through the paid period only", () => {
    expect(
      hasValidAccess(
        {
          ...base,
          status: "CANCELED",
          paymentProvider: "polar",
          currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
        },
        now,
      ).allowed,
    ).toBe(true);
    expect(
      hasValidAccess(
        {
          ...base,
          status: "CANCELED",
          paymentProvider: "polar",
          currentPeriodEnd: new Date("2026-07-29T00:00:00.000Z"),
        },
        now,
      ),
    ).toEqual({ allowed: false, reason: "canceled_expired" });
  });

  it("applies the past-due grace window", () => {
    expect(
      hasValidAccess(
        {
          ...base,
          status: "PAST_DUE",
          paymentProvider: "polar",
          pastDueAt: new Date("2026-07-29T12:00:00.000Z"),
        },
        now,
      ).allowed,
    ).toBe(true);
    expect(
      hasValidAccess(
        {
          ...base,
          status: "PAST_DUE",
          paymentProvider: "polar",
          pastDueAt: new Date("2026-07-01T12:00:00.000Z"),
        },
        now,
      ),
    ).toEqual({ allowed: false, reason: "past_due_grace_ended" });
  });

  it.each([
    ["PENDING_PREFERENCES", "pending_preferences"],
    ["PENDING_CHECKOUT", "checkout_required"],
    ["TRIAL_EXPIRED", "trial_expired"],
    ["EXPIRED", "access_expired"],
    ["UNKNOWN", "unknown_status"],
  ])("rejects %s with %s", (status, reason) => {
    expect(hasValidAccess({ ...base, status }, now)).toEqual({
      allowed: false,
      reason,
    });
  });
});
