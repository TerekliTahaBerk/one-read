import { describe, expect, it } from "vitest";
import { shouldManageAccount } from "./signup-routing";

describe("signup account routing", () => {
  it.each(["active_paid", "trialing", "canceled_active", "active_email_paused", "suppressed"])("manages entitled %s readers before onboarding", (state) => {
    expect(shouldManageAccount({ state, products: { "one-news": { active: true } } })).toBe(true);
  });
  it("keeps past-due readers in billing management even after grace lapses", () => {
    expect(shouldManageAccount({ state: "past_due" })).toBe(true);
    expect(shouldManageAccount({ state: "new", billing: { plans: [{ state: "Past due" }] } })).toBe(true);
  });
  it.each(["new", "incomplete", "checkout_needed", "expired", "trial_expired"])("continues onboarding for %s even with billing history", (state) => {
    expect(shouldManageAccount({ state, products: { "one-article": { active: false } }, billing: { plans: [{ state: "Expired" }] } })).toBe(false);
  });
});
