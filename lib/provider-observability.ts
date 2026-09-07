import {
  reportOperationalEvent,
  type ObservabilitySubsystem,
  type OperationalSeverity,
  type RetryClassification,
} from "@/lib/observability";

export type ProviderName = "polar" | "resend";

export const PROVIDER_FAILURE_POLICY = {
  polar_checkout_config_invalid: {
    provider: "polar", subsystem: "billing", operation: "create_checkout", severity: "CRITICAL", alertable: true,
    retryClassification: "not_retryable", action: "Fix Polar checkout credentials/product configuration, then run the launch smoke checkout.",
  },
  polar_checkout_provider_failed: {
    provider: "polar", subsystem: "billing", operation: "create_checkout", severity: "ERROR", alertable: true,
    retryClassification: "retryable", action: "Inspect Polar status and request error; retry the individual checkout after provider recovery.",
  },
  polar_webhook_config_invalid: {
    provider: "polar", subsystem: "polar_webhook", operation: "verify_webhook", severity: "CRITICAL", alertable: true,
    retryClassification: "not_retryable", action: "Restore POLAR_WEBHOOK_SECRET and redeliver missed Polar events.",
  },
  polar_webhook_signature_invalid: {
    provider: "polar", subsystem: "polar_webhook", operation: "verify_webhook", severity: "WARNING", alertable: false,
    retryClassification: "not_retryable", action: "No pager action; investigate only if volume rises or legitimate deliveries are rejected.",
  },
  polar_webhook_processing_failed: {
    provider: "polar", subsystem: "polar_webhook", operation: "process_webhook", severity: "ERROR", alertable: true,
    retryClassification: "provider_retry", action: "Inspect the correlated event and allow Polar redelivery after the runtime fault is fixed.",
  },
  polar_billing_reconciliation_required: {
    provider: "polar", subsystem: "reconciliation", operation: "reconcile_billing", severity: "ERROR", alertable: true,
    retryClassification: "reconciliation_required", action: "Compare the event with Polar and reconcile manually; never infer entitlement.",
  },
  polar_webhook_safe_noop: {
    provider: "polar", subsystem: "polar_webhook", operation: "process_webhook", severity: "INFO", alertable: false,
    retryClassification: "not_retryable", action: "No action; duplicate, stale, or unsupported event was handled safely.",
  },
  resend_config_invalid: {
    provider: "resend", subsystem: "delivery", operation: "send_email", severity: "CRITICAL", alertable: true,
    retryClassification: "not_retryable", action: "Fix the Resend API key, verified sender domain, reply-to, and webhook secret before resuming delivery.",
  },
  resend_hard_send_failure: {
    provider: "resend", subsystem: "delivery", operation: "send_email", severity: "ERROR", alertable: true,
    retryClassification: "retryable", action: "Inspect the provider rejection and retry only the failed delivery after correction.",
  },
  resend_ambiguous_outcome: {
    provider: "resend", subsystem: "delivery", operation: "send_email", severity: "ERROR", alertable: true,
    retryClassification: "reconciliation_required", action: "Check Resend by correlation id; do not automatically resend an outcome that may have been accepted.",
  },
  resend_accepted_persistence_failed: {
    provider: "resend", subsystem: "delivery", operation: "persist_provider_acceptance", severity: "ERROR", alertable: true,
    retryClassification: "retryable", action: "Retry with the same idempotency key inside Resend's retention window; reconcile after the window expires.",
  },
  resend_delivery_reconciliation_required: {
    provider: "resend", subsystem: "reconciliation", operation: "reconcile_delivery", severity: "ERROR", alertable: true,
    retryClassification: "reconciliation_required", action: "Resolve provider acceptance before using the explicit recovery action.",
  },
  resend_webhook_config_invalid: {
    provider: "resend", subsystem: "resend_webhook", operation: "verify_webhook", severity: "CRITICAL", alertable: true,
    retryClassification: "not_retryable", action: "Restore RESEND_WEBHOOK_SECRET and reconcile provider delivery states.",
  },
  resend_webhook_signature_invalid: {
    provider: "resend", subsystem: "resend_webhook", operation: "verify_webhook", severity: "WARNING", alertable: false,
    retryClassification: "not_retryable", action: "No pager action; investigate only sustained volume or rejected legitimate webhooks.",
  },
  resend_webhook_processing_failed: {
    provider: "resend", subsystem: "resend_webhook", operation: "process_webhook", severity: "ERROR", alertable: true,
    retryClassification: "provider_retry", action: "Fix processing and redeliver the correlated Resend event.",
  },
  resend_business_suppression: {
    provider: "resend", subsystem: "resend_webhook", operation: "apply_delivery_status", severity: "INFO", alertable: false,
    retryClassification: "not_retryable", action: "No incident; keep the recipient suppressed for bounce, complaint, or unsubscribe policy.",
  },
} as const satisfies Record<string, {
  provider: ProviderName;
  subsystem: ObservabilitySubsystem;
  operation: string;
  severity: OperationalSeverity;
  alertable: boolean;
  retryClassification: RetryClassification;
  action: string;
}>;

export type ProviderFailureClass = keyof typeof PROVIDER_FAILURE_POLICY;

export async function reportProviderEvent(
  failureClass: ProviderFailureClass,
  input: {
    productKey?: string | null;
    operation?: string;
    outcome?: string;
    state?: string | null;
    correlationId?: string | null;
    errorCode?: string | null;
    error?: unknown;
    flush?: boolean;
    metadata?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const policy = PROVIDER_FAILURE_POLICY[failureClass];
  const operation = input.operation ?? policy.operation;
  await reportOperationalEvent("provider_operation", {
    subsystem: policy.subsystem,
    productKey: input.productKey,
    operation,
    outcome: input.outcome ?? (policy.alertable ? "degraded" : "handled"),
    state: input.state ?? failureClass,
    correlationId: input.correlationId,
    retryClassification: policy.retryClassification,
    errorCode: input.errorCode ?? failureClass,
    severity: policy.severity,
    alertable: policy.alertable,
    action: policy.action,
    fingerprint: ["provider", policy.provider, operation, failureClass],
    metadata: { provider: policy.provider, failure_class: failureClass, ...input.metadata },
  }, {
    error: input.error,
    level: policy.severity === "INFO" ? "info" : policy.severity === "WARNING" ? "warning" : "error",
    flush: input.flush,
  });
}
