import { describe, expect, it, vi } from "vitest";

const reportOperationalEvent = vi.fn();
vi.mock("@/lib/observability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/observability")>()),
  reportOperationalEvent: (...args: unknown[]) => reportOperationalEvent(...args),
}));

import { PROVIDER_FAILURE_POLICY, reportProviderEvent } from "./provider-observability";

describe("provider failure policy", () => {
  it.each([
    ["polar_checkout_config_invalid", "CRITICAL", true, "not_retryable"],
    ["polar_checkout_provider_failed", "ERROR", true, "retryable"],
    ["polar_webhook_config_invalid", "CRITICAL", true, "not_retryable"],
    ["polar_webhook_signature_invalid", "WARNING", false, "not_retryable"],
    ["polar_webhook_processing_failed", "ERROR", true, "provider_retry"],
    ["polar_billing_reconciliation_required", "ERROR", true, "reconciliation_required"],
    ["polar_webhook_safe_noop", "INFO", false, "not_retryable"],
    ["resend_config_invalid", "CRITICAL", true, "not_retryable"],
    ["resend_hard_send_failure", "ERROR", true, "retryable"],
    ["resend_ambiguous_outcome", "ERROR", true, "reconciliation_required"],
    ["resend_accepted_persistence_failed", "ERROR", true, "retryable"],
    ["resend_delivery_reconciliation_required", "ERROR", true, "reconciliation_required"],
    ["resend_webhook_config_invalid", "CRITICAL", true, "not_retryable"],
    ["resend_webhook_signature_invalid", "WARNING", false, "not_retryable"],
    ["resend_webhook_processing_failed", "ERROR", true, "provider_retry"],
    ["resend_business_suppression", "INFO", false, "not_retryable"],
  ] as const)("classifies %s", (failureClass, severity, alertable, retryClassification) => {
    expect(PROVIDER_FAILURE_POLICY[failureClass]).toMatchObject({ severity, alertable, retryClassification });
    expect(PROVIDER_FAILURE_POLICY[failureClass].action).toBeTruthy();
  });

  it("emits searchable tags, operator action, and a stable outage fingerprint", async () => {
    await reportProviderEvent("resend_ambiguous_outcome", {
      productKey: "one-news", operation: "send_editorial",
      correlationId: "provider-id", errorCode: "transport_closed",
    });
    expect(reportOperationalEvent).toHaveBeenCalledWith(
      "provider_operation",
      expect.objectContaining({
        productKey: "one-news", operation: "send_editorial", severity: "ERROR", alertable: true,
        retryClassification: "reconciliation_required",
        fingerprint: ["provider", "resend", "send_editorial", "resend_ambiguous_outcome"],
        metadata: expect.objectContaining({ provider: "resend", failure_class: "resend_ambiguous_outcome" }),
      }),
      expect.objectContaining({ level: "error" }),
    );
  });
});
