/**
 * Reconciliation diagnosis.
 *
 * Every case here is a divergence that was previously invisible: it produced no
 * error, no failed webhook and no admin warning, and only surfaced as a
 * subscriber who was billed and received nothing, or the reverse. The point of
 * the tests is that each one now has a name and a required reason.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ANOMALY_CODES,
  diagnose,
  maskCorrelationId,
  summarizeEventOutcomes,
  type AnomalyCode,
  type ProviderSnapshot,
  type ReconcilableEvent,
  type ReconcilableSubscription,
} from "@/lib/billing/reconciliation";
import {
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

const NOW = new Date("2026-06-16T12:00:00Z");
const FUTURE = new Date("2026-07-16T12:00:00Z");
const PAST = new Date("2026-06-01T12:00:00Z");

beforeEach(() => configureAllOffers());
afterEach(() => clearOfferEnv());

function sub(overrides: Partial<ReconcilableSubscription> = {}): ReconcilableSubscription {
  return {
    id: "sub_1",
    contactId: "contact_1",
    productKey: "one-article",
    status: "ACTIVE_PAID",
    plan: "monthly",
    offerKey: "one-article",
    paymentProvider: "polar",
    adminOverride: false,
    providerCustomerId: "polar_customer_abcdef123",
    providerSubscriptionId: "polar_sub_abcdef123",
    providerProductId: testProductId("one-article", "monthly"),
    trialEndsAt: null,
    currentPeriodStart: PAST,
    currentPeriodEnd: FUTURE,
    pastDueAt: null,
    cancelAtPeriodEnd: false,
    billingStateUpdatedAt: PAST,
    emailDeliveryStatus: "SUBSCRIBED",
    updatedAt: PAST,
    ...overrides,
  };
}

let eventSeq = 0;
function event(overrides: Partial<ReconcilableEvent> = {}): ReconcilableEvent {
  eventSeq += 1;
  return {
    providerEventId: `evt_${eventSeq}_abcdefghij`,
    provider: "polar",
    type: "subscription.updated",
    outcome: "applied",
    processedAt: PAST,
    createdAt: PAST,
    subscriptionId: "sub_1",
    providerSubscriptionId: "polar_sub_abcdef123",
    ...overrides,
  };
}

function snapshot(overrides: Partial<ProviderSnapshot> = {}): ProviderSnapshot {
  return {
    status: "active",
    productId: testProductId("one-article", "monthly"),
    currentPeriodEnd: FUTURE,
    cancelAtPeriodEnd: false,
    observedAt: NOW,
    ...overrides,
  };
}

const codes = (report: { anomalies: readonly { code: AnomalyCode }[] }) =>
  report.anomalies.map((a) => a.code);

describe("maskCorrelationId", () => {
  it("keeps a matchable head and tail of a long id", () => {
    expect(maskCorrelationId("polar_sub_abcdef123")).toBe("pola…f123");
  });

  it("masks a short id entirely rather than revealing most of it", () => {
    expect(maskCorrelationId("sub_12345")).toBe("•••••••••");
  });

  it("returns null for absent ids", () => {
    expect(maskCorrelationId(null)).toBeNull();
    expect(maskCorrelationId("   ")).toBeNull();
  });
});

describe("diagnose — a healthy subscription", () => {
  it("reports no anomalies and requires no reconciliation", () => {
    const report = diagnose({ subscription: sub(), events: [event()], now: NOW });

    expect(report.anomalies).toEqual([]);
    expect(report.reconciliationRequired).toBe(false);
    expect(report.requiredReason).toBeNull();
    expect(report.recommendedAction).toBeNull();
    expect(report.entitlement.entitled).toBe(true);
  });

  it("never exposes a raw provider correlation id", () => {
    const report = diagnose({ subscription: sub(), events: [], now: NOW });

    expect(report.correlation.subscription).not.toContain("abcdef123");
    expect(JSON.stringify(report)).not.toContain("polar_sub_abcdef123");
  });
});

describe("diagnose — local-only divergences", () => {
  it("flags a paid row with no provider correlation id as critical", () => {
    const report = diagnose({
      subscription: sub({ providerSubscriptionId: null }),
      events: [],
      now: NOW,
    });

    expect(codes(report)).toContain("missing_correlation_id");
    expect(report.reconciliationRequired).toBe(true);
    expect(report.recommendedAction).toBe("link_provider_subscription");
  });

  it("does not flag a missing correlation id on an admin comp", () => {
    const report = diagnose({
      subscription: sub({ providerSubscriptionId: null, adminOverride: true, paymentProvider: null }),
      events: [],
      now: NOW,
    });

    expect(codes(report)).not.toContain("missing_correlation_id");
  });

  it("flags a status the lifecycle contract cannot interpret", () => {
    const report = diagnose({
      subscription: sub({ status: "SOMETHING_NEW" }),
      events: [event()],
      now: NOW,
    });

    expect(codes(report)).toContain("unknown_local_status");
    expect(report.entitlement.entitled).toBe(false);
  });

  it("flags paid-looking state that no provider ever confirmed", () => {
    const report = diagnose({
      subscription: sub({ paymentProvider: null }),
      events: [event()],
      now: NOW,
    });

    expect(codes(report)).toContain("entitlement_without_provider_confirmation");
    expect(report.entitlement.entitled).toBe(false);
    expect(report.reconciliationRequired).toBe(true);
  });

  it("flags a live row whose offer was never identified", () => {
    const report = diagnose({
      subscription: sub({ productKey: "one-read", offerKey: null, providerProductId: null }),
      events: [event()],
      now: NOW,
    });

    expect(codes(report)).toContain("unclassified_offer");
    expect(report.offer.grants).toEqual(["one-article"]);
  });

  it("treats an unidentified offer on a dormant row as information only", () => {
    const report = diagnose({
      subscription: sub({
        productKey: "one-read",
        status: "EXPIRED",
        offerKey: null,
        providerProductId: null,
      }),
      events: [],
      now: NOW,
    });

    const anomaly = report.anomalies.find((a) => a.code === "unclassified_offer");
    expect(anomaly?.severity).toBe("info");
    expect(anomaly?.requiresReconciliation).toBe(false);
  });
});

describe("diagnose — event-history divergences", () => {
  it("flags events that matched no subscriber at all", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event(), event({ outcome: "no_subscription", subscriptionId: null })],
      now: NOW,
    });

    expect(codes(report)).toContain("unmatched_provider_events");
    expect(report.recommendedAction).toBe("manual_provider_investigation");
    expect(report.events.unmatched).toBe(1);
  });

  it("flags events carrying an unconfigured product", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event({ outcome: "unrecognized_product" })],
      now: NOW,
    });

    expect(codes(report)).toContain("unrecognized_product_events");
    expect(report.reconciliationRequired).toBe(true);
  });

  it("flags the same event type applied twice for one provider object", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event({ type: "order.paid" }), event({ type: "order.paid" })],
      now: NOW,
    });

    expect(codes(report)).toContain("duplicate_applied_events");
  });

  it("does not call two different event types a duplicate", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event({ type: "order.paid" }), event({ type: "subscription.updated" })],
      now: NOW,
    });

    expect(codes(report)).not.toContain("duplicate_applied_events");
  });

  it("flags paid state with no applied event behind it", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event({ outcome: "ignored_event_type" })],
      now: NOW,
    });

    expect(codes(report)).toContain("missing_provider_events");
  });

  it("flags a stale refusal that arrived after the last accepted event", () => {
    const report = diagnose({
      subscription: sub(),
      events: [
        event({ createdAt: PAST }),
        event({ outcome: "ignored_stale", createdAt: NOW }),
      ],
      now: NOW,
    });

    expect(codes(report)).toContain("stale_event_ordering");
  });

  it("does not flag ordering when the stale refusal predates the accepted event", () => {
    const report = diagnose({
      subscription: sub(),
      events: [
        event({ outcome: "ignored_stale", createdAt: PAST }),
        event({ createdAt: NOW }),
      ],
      now: NOW,
    });

    expect(codes(report)).not.toContain("stale_event_ordering");
  });
});

describe("diagnose — live provider divergence", () => {
  it("flags a provider status that disagrees with local state", () => {
    const report = diagnose({
      subscription: sub({ status: "ACTIVE_PAID" }),
      events: [event()],
      provider: snapshot({ status: "canceled" }),
      now: NOW,
    });

    const anomaly = report.anomalies.find((a) => a.code === "provider_status_divergence");
    expect(anomaly?.severity).toBe("critical");
    expect(report.recommendedAction).toBe("apply_provider_snapshot");
  });

  it("refuses to interpret a provider status it does not model", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event()],
      provider: snapshot({ status: "paused_for_holiday" }),
      now: NOW,
    });

    const anomaly = report.anomalies.find((a) => a.code === "provider_status_divergence");
    expect(anomaly?.severity).toBe("warning");
    expect(anomaly?.summary).toContain("does not model");
  });

  it("treats a provider window that ends earlier than ours as critical", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event()],
      provider: snapshot({ currentPeriodEnd: PAST }),
      now: NOW,
    });

    const anomaly = report.anomalies.find((a) => a.code === "provider_period_divergence");
    expect(anomaly?.severity).toBe("critical");
  });

  it("treats a provider window that ends later than ours as a warning", () => {
    const report = diagnose({
      subscription: sub(),
      events: [event()],
      provider: snapshot({ currentPeriodEnd: new Date("2026-09-16T12:00:00Z") }),
      now: NOW,
    });

    const anomaly = report.anomalies.find((a) => a.code === "provider_period_divergence");
    expect(anomaly?.severity).toBe("warning");
  });

  it("flags a cancellation the provider knows about and we do not", () => {
    const report = diagnose({
      subscription: sub({ cancelAtPeriodEnd: false }),
      events: [event()],
      provider: snapshot({ cancelAtPeriodEnd: true }),
      now: NOW,
    });

    expect(codes(report)).toContain("provider_status_divergence");
  });

  it("produces a full report with no provider snapshot at all", () => {
    const report = diagnose({ subscription: sub(), events: [event()], now: NOW });
    expect(report.entitlement.state).toBe("active");
  });
});

describe("diagnose — the required reason", () => {
  it("reports the most severe blocking anomaly as the required reason", () => {
    const report = diagnose({
      subscription: sub({ productKey: "one-read", offerKey: null, providerProductId: null }),
      events: [event({ outcome: "no_subscription", subscriptionId: null })],
      now: NOW,
    });

    expect(report.requiredReason).toBe("unmatched_provider_events");
  });

  it("only names codes from the published vocabulary", () => {
    const report = diagnose({
      subscription: sub({ status: "WAT", providerSubscriptionId: null, paymentProvider: null }),
      events: [event({ outcome: "no_subscription" }), event({ outcome: "unrecognized_product" })],
      provider: snapshot({ status: "canceled" }),
      now: NOW,
    });

    for (const anomaly of report.anomalies) {
      expect(ANOMALY_CODES).toContain(anomaly.code);
    }
  });
});

describe("summarizeEventOutcomes", () => {
  it("counts unprocessed events and those needing a person", () => {
    const summary = summarizeEventOutcomes([
      { outcome: "applied", processedAt: PAST },
      { outcome: "no_subscription", processedAt: PAST },
      { outcome: "unrecognized_product", processedAt: PAST },
      { outcome: null, processedAt: null },
    ]);

    expect(summary.total).toBe(4);
    expect(summary.unprocessed).toBe(1);
    expect(summary.needingReconciliation).toBe(2);
    expect(summary.byOutcome.applied).toBe(1);
  });
});
