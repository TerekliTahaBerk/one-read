import { describe, expect, it } from "vitest";
import { oneNewsDeliveryIdempotencyKey, resolveOneNewsIssueDeliveryStatus } from "./delivery";

describe("OneNews delivery invariants", () => {
  it("uses a stable address-free provider idempotency key", () => {
    expect(oneNewsDeliveryIdempotencyKey("issue-1", "contact-1")).toBe("onenews-issue-1-contact-1");
    expect(oneNewsDeliveryIdempotencyKey("issue-1", "contact-1")).not.toContain("@");
  });

  it.each([
    [3, 0, "SENT"],
    [2, 1, "PARTIALLY_FAILED"],
    [0, 1, "FAILED"],
  ] as const)("resolves %s accepted and %s unresolved to %s", (sent, unresolved, status) => {
    expect(resolveOneNewsIssueDeliveryStatus(sent, unresolved)).toBe(status);
  });
});
