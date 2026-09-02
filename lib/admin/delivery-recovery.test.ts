import { describe, expect, it } from "vitest";
import { describeDeliveryFailure } from "./delivery-recovery";

const base = {
  status: "SENT",
  providerStatus: null as string | null,
  attemptCount: 1,
  failedReason: null as string | null,
};

describe("describeDeliveryFailure", () => {
  it("never offers to retry an ambiguous send", () => {
    const verdict = describeDeliveryFailure({ ...base, status: "RECONCILIATION_REQUIRED" });
    expect(verdict.safeToRetry).toBe(false);
    expect(verdict.what).toMatch(/cannot prove/i);
  });

  it("never offers to retry a send the provider is still delaying", () => {
    const verdict = describeDeliveryFailure({ ...base, providerStatus: "DELAYED" });
    expect(verdict.safeToRetry).toBe(false);
  });

  it.each(["BOUNCED", "COMPLAINED"])("treats %s as terminal policy suppression", (status) => {
    const verdict = describeDeliveryFailure({ ...base, providerStatus: status });
    expect(verdict.safeToRetry).toBe(false);
    expect(verdict.recovery).toMatch(/do not resend/i);
  });

  it("allows retry once the provider confirms a failure", () => {
    const verdict = describeDeliveryFailure({
      ...base,
      status: "FAILED",
      providerStatus: "FAILED",
      failedReason: "mailbox unavailable",
    });
    expect(verdict.safeToRetry).toBe(true);
    expect(verdict.what).toBe("mailbox unavailable");
  });

  it("distinguishes automatic retry from exhausted retries", () => {
    const retryable = describeDeliveryFailure({ ...base, status: "FAILED", attemptCount: 1 });
    expect(retryable.recovery).toMatch(/automatic retry/i);

    const exhausted = describeDeliveryFailure({ ...base, status: "FAILED", attemptCount: 3 });
    expect(exhausted.recovery).toMatch(/exhausted/i);
    expect(exhausted.safeToRetry).toBe(true);
  });

  it("ranks ambiguity above a provider status when both are present", () => {
    // An ambiguous row that later received a delivered event must still be
    // reconciled by hand rather than silently treated as successful.
    const verdict = describeDeliveryFailure({
      ...base,
      status: "RECONCILIATION_REQUIRED",
      providerStatus: "DELIVERED",
    });
    expect(verdict.safeToRetry).toBe(false);
    expect(verdict.recovery).toMatch(/reconcile/i);
  });
});
