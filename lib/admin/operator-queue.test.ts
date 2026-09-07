import { describe, expect, it } from "vitest";
import { isSafeDeliveryRetry } from "@/lib/admin/operator-queue";

const base = {
  status: "FAILED", providerStatus: null, providerAcceptedAt: null,
  subscriptionStatus: "ACTIVE_PAID", emailDeliveryStatus: "SUBSCRIBED",
};

describe("operator queue delivery retry contract", () => {
  it("allows only a confirmed pre-acceptance hard failure", () => {
    expect(isSafeDeliveryRetry(base)).toBe(true);
  });
  it.each([
    [{ ...base, status: "RECONCILIATION_REQUIRED" }, "ambiguous"],
    [{ ...base, providerAcceptedAt: new Date() }, "provider accepted"],
    [{ ...base, providerStatus: "DELAYED" }, "provider unresolved"],
    [{ ...base, emailDeliveryStatus: "SUPPRESSED" }, "suppressed"],
    [{ ...base, subscriptionStatus: "CANCELED" }, "canceled"],
  ])("refuses %s (%s)", (row) => expect(isSafeDeliveryRetry(row)).toBe(false));
});
