import { MAX_AUTOMATIC_DELIVERY_ATTEMPTS } from "@/lib/one-article/editorial";

/**
 * Turns a delivery row into the two sentences an operator actually needs:
 * what happened, and what may safely be done about it.
 *
 * The safety rule this encodes: a resend is only ever safe when OneRead knows
 * the message did *not* reach the recipient. An ambiguous send (acceptance
 * could not be proven) and a provider delay (outcome still pending) both fail
 * that test, so neither is retryable — resending either can duplicate real
 * mail. Bounces and complaints are terminal by policy, not by transport.
 */
export interface DeliveryFailureVerdict {
  what: string;
  recovery: string;
  safeToRetry: boolean;
}

export function describeDeliveryFailure(delivery: {
  status: string;
  providerStatus: string | null;
  attemptCount: number;
  failedReason: string | null;
}): DeliveryFailureVerdict {
  if (delivery.status === "RECONCILIATION_REQUIRED") {
    return {
      what: "Ambiguous — OneRead cannot prove Resend accepted this message.",
      recovery: "Reconcile manually. Never resend blindly.",
      safeToRetry: false,
    };
  }

  switch (delivery.providerStatus) {
    case "COMPLAINED":
      return {
        what: "Recipient marked the mail as spam.",
        recovery: "Suppressed by policy. Do not resend.",
        safeToRetry: false,
      };
    case "BOUNCED":
      return {
        what: "Provider rejected the address as undeliverable.",
        recovery: "Suppressed by policy. Do not resend.",
        safeToRetry: false,
      };
    case "DELAYED":
      return {
        what: "Provider reports delivery is delayed; the outcome is still open.",
        recovery: "Wait for a terminal event. Resending may duplicate mail.",
        safeToRetry: false,
      };
    case "FAILED":
      return {
        what: delivery.failedReason ?? "Provider confirmed the message failed.",
        recovery: "Safe to retry from the edition screen.",
        safeToRetry: true,
      };
    default:
      break;
  }

  if (delivery.status === "FAILED") {
    const exhausted = delivery.attemptCount >= MAX_AUTOMATIC_DELIVERY_ATTEMPTS;
    return {
      what: delivery.failedReason ?? "Send failed before the provider accepted it.",
      recovery: exhausted
        ? `Automatic retries exhausted after ${delivery.attemptCount}. Needs an explicit operator retry.`
        : "Eligible for automatic retry on the next run.",
      safeToRetry: true,
    };
  }

  return {
    what: delivery.failedReason ?? "Provider reported a non-delivery event.",
    recovery: "Inspect the edition before acting.",
    safeToRetry: false,
  };
}
