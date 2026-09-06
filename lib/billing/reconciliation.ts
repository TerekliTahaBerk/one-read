/**
 * Billing reconciliation — deterministic diagnosis of provider/local divergence.
 *
 * ── What this module is for ─────────────────────────────────────────────────
 * Polar is the source of truth for money; the local ProductSubscription row is
 * the source of truth for access. They are kept in step by webhooks, and
 * webhooks can be lost, reordered, delivered for a product we do not recognise,
 * or arrive with no local subscriber to attach to. When that happens the two
 * sides diverge, and today the divergence is only visible as a symptom
 * elsewhere: a paying customer who receives nothing, or a cancelled customer
 * who keeps receiving.
 *
 * `diagnose` turns one subscriber's state into an explicit, named list of
 * divergences plus the single reason reconciliation is required. It is the
 * diagnosis half of the pair; `lib/billing/repair.ts` is the repair half.
 *
 * ── Why it is pure ──────────────────────────────────────────────────────────
 * No Prisma, no clock of its own, no provider calls. Callers gather the inputs
 * (the row, its recent BillingEvents, optionally a live provider snapshot) and
 * pass them in. That is what makes every anomaly in this file reproducible from
 * a fixture in a test, and what stops diagnosis from ever mutating the thing it
 * is diagnosing.
 *
 * ── What it deliberately does not do ────────────────────────────────────────
 * It never repairs, and it never guesses. Where evidence is missing the report
 * says the evidence is missing rather than inferring the likely truth: an
 * unclassified `one-read` row stays unclassified here exactly as it does in
 * lib/products/classification.ts, because a guess that over-grants is worse
 * than a report that says "a person has to look at this".
 *
 * ── PII ─────────────────────────────────────────────────────────────────────
 * A report never carries an email address, a name, or a raw provider
 * correlation id. Provider ids are masked to their first and last few
 * characters — enough to match against a Polar dashboard row by eye, not enough
 * to be a useful leak in a log, a screenshot or a support ticket.
 */

import { resolveLifecycle, type LifecycleResolution } from "@/lib/billing/lifecycle";
import { classifySubscription } from "@/lib/products/classification";
import { needsReconciliation, polarStatusToLocal } from "@/lib/billing/polar";
import type { ProductKey } from "@/lib/products/registry";

/* ================================ masking ================================= */

/**
 * Masks a provider correlation id for operator display.
 *
 * Keeps a short head and tail so an operator can confirm they are looking at
 * the same object in Polar, and drops the middle. Anything short enough that
 * head+tail would reveal most of it is masked entirely rather than
 * half-heartedly.
 */
export function maskCorrelationId(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.length <= 10) return "•".repeat(raw.length);
  return `${raw.slice(0, 4)}…${raw.slice(-4)}`;
}

/* ============================== the vocabulary ============================= */

/**
 * The divergence kinds this module can name.
 *
 * Each one is a distinct operational story, not a severity bucket: the point of
 * separate codes is that the recommended repair differs. Adding a code here
 * means adding the detector below and, if it is repairable, a matching action
 * in lib/billing/repair.ts.
 */
export const ANOMALY_CODES = [
  /** Provider events arrived that matched no local subscriber at all. */
  "unmatched_provider_events",
  /** Events carried a Polar product id missing from configuration. */
  "unrecognized_product_events",
  /** The same provider object was applied more than once in the window. */
  "duplicate_applied_events",
  /** Local state claims paid access with no applied provider event behind it. */
  "missing_provider_events",
  /** Deliveries arrived out of order and were refused as older than local state. */
  "stale_event_ordering",
  /** A paid row holds no provider subscription id to correlate with. */
  "missing_correlation_id",
  /** A live row whose commercial offer was never identified. */
  "unclassified_offer",
  /** The stored status is not a value the lifecycle contract models. */
  "unknown_local_status",
  /** Entitled locally, but no provider ever confirmed the money. */
  "entitlement_without_provider_confirmation",
  /** A provider snapshot disagrees with the local billing status. */
  "provider_status_divergence",
  /** A provider snapshot disagrees with the local access window. */
  "provider_period_divergence",
] as const;

export type AnomalyCode = (typeof ANOMALY_CODES)[number];

/**
 * How much the divergence costs if left alone.
 *
 * `critical` is reserved for the two directions that touch money or access:
 * someone paid and has nothing, or someone has access nobody confirmed.
 * `warning` is a real divergence with no immediate access consequence.
 * `info` is context an operator needs while reading the rest.
 */
export type AnomalySeverity = "info" | "warning" | "critical";

export interface Anomaly {
  code: AnomalyCode;
  severity: AnomalySeverity;
  /** Plain-English statement of what is wrong. Never contains PII. */
  summary: string;
  /** Whether this alone means the subscriber cannot be left as they are. */
  requiresReconciliation: boolean;
  /** Supporting counts/ids, already masked. */
  evidence?: Readonly<Record<string, string | number | null>>;
}

/* ================================= input ================================== */

/** The subscription fields diagnosis reads. Structural, so tests can build it. */
export interface ReconcilableSubscription {
  id: string;
  contactId: string;
  productKey: string;
  status: string;
  plan: string | null;
  offerKey: string | null;
  paymentProvider: string | null;
  adminOverride: boolean;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerProductId: string | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  pastDueAt: Date | null;
  cancelAtPeriodEnd: boolean | null;
  billingStateUpdatedAt: Date | null;
  emailDeliveryStatus: string;
  updatedAt: Date | null;
}

/** A BillingEvent row, reduced to what diagnosis needs. Payloads never enter. */
export interface ReconcilableEvent {
  providerEventId: string;
  provider: string;
  type: string;
  outcome: string | null;
  processedAt: Date | null;
  createdAt: Date;
  /** The local subscription the event resolved to, when it resolved to one. */
  subscriptionId?: string | null;
  /** Provider subscription id seen on the event, when present. */
  providerSubscriptionId?: string | null;
}

/**
 * A live read of provider state, when the operator has fetched one.
 *
 * Optional throughout: the whole report must be produceable from local data
 * alone, because the first thing an operator does during a provider incident is
 * exactly the thing that cannot call the provider.
 */
export interface ProviderSnapshot {
  /** Polar's own status vocabulary, e.g. "active", "past_due". */
  status: string | null;
  productId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  /** When this snapshot was taken. Used as the provider clock for repairs. */
  observedAt: Date;
}

export interface DiagnosisInput {
  subscription: ReconcilableSubscription;
  /** Events correlated to this subscriber, plus any that matched nobody. */
  events: readonly ReconcilableEvent[];
  provider?: ProviderSnapshot | null;
  now?: Date;
}

/* ================================= output ================================= */

export interface ReconciliationReport {
  subscriptionId: string;
  productKey: string;
  /** What was bought, as far as the evidence supports. */
  offer: {
    offerKey: string | null;
    plan: string | null;
    grants: readonly ProductKey[];
    grandfathered: boolean;
    /** Which evidence tier decided it: product_key < offer_key < provider_product. */
    evidence: string;
  };
  billing: {
    status: string;
    /** Provider clock for the last state change we accepted. */
    stateUpdatedAt: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    emailDeliveryStatus: string;
  };
  entitlement: {
    state: LifecycleResolution["state"];
    entitled: boolean;
    reason: LifecycleResolution["reason"];
    effectiveUntil: Date | null;
  };
  /** Masked provider ids, safe to paste into a ticket. */
  correlation: {
    provider: string | null;
    customer: string | null;
    subscription: string | null;
    product: string | null;
  };
  events: {
    considered: number;
    applied: number;
    ignoredStale: number;
    unmatched: number;
    unrecognizedProduct: number;
    latestType: string | null;
    latestAt: Date | null;
    latestOutcome: string | null;
  };
  anomalies: readonly Anomaly[];
  reconciliationRequired: boolean;
  /** The single most severe reason, or null when nothing is wrong. */
  requiredReason: AnomalyCode | null;
  /** The repair action to consider, or null when none is safe to suggest. */
  recommendedAction: RecommendedAction | null;
}

/**
 * A repair suggestion. Deliberately a *name*, not a closure: nothing in this
 * module can perform a repair, and an operator must ask for one by name.
 */
export type RecommendedAction =
  | "link_provider_subscription"
  | "classify_offer"
  | "apply_provider_snapshot"
  | "manual_provider_investigation";

/* =============================== detection ================================ */

/** Statuses that assert the subscriber is, or recently was, paying. */
const PAID_STATUSES = new Set(["ACTIVE_PAID", "PAST_DUE", "CANCELED", "TRIALING"]);

const SEVERITY_RANK: Record<AnomalySeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

function isApplied(event: ReconcilableEvent): boolean {
  return event.outcome === "applied";
}

/**
 * Applied events that describe the same provider object and event type more
 * than once inside the window.
 *
 * `providerEventId` is unique, so this is never a redelivery of one event — it
 * is two distinct provider events saying the same thing, which is how a
 * duplicated subscription or a double-processed order shows up.
 */
function findDuplicates(events: readonly ReconcilableEvent[]): string[] {
  const seen = new Map<string, number>();
  for (const event of events) {
    if (!isApplied(event)) continue;
    const key = `${event.type}::${event.providerSubscriptionId ?? event.subscriptionId ?? "—"}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen.entries()].filter(([, count]) => count > 1).map(([key]) => key);
}

/**
 * Whether local state was written from something newer than the newest event we
 * accepted.
 *
 * A gap here is not automatically wrong — an admin override or a repair also
 * moves the clock — but combined with refused stale deliveries it is the
 * signature of reordering that never resolved.
 */
function hasStaleOrdering(
  sub: ReconcilableSubscription,
  events: readonly ReconcilableEvent[],
): boolean {
  const staleRefusals = events.filter((event) => event.outcome === "ignored_stale");
  if (staleRefusals.length === 0) return false;

  const newestApplied = events
    .filter(isApplied)
    .reduce<Date | null>(
      (max, event) => (!max || event.createdAt > max ? event.createdAt : max),
      null,
    );
  if (!newestApplied) return true;

  // A refusal that arrived *after* the last thing we accepted means the last
  // word from the provider was discarded as old and nothing replaced it.
  return staleRefusals.some((event) => event.createdAt > newestApplied);
}

/**
 * Diagnoses one subscriber. Pure: same inputs, same report, always.
 *
 * The order of the detectors below is the order an operator reads them in —
 * identity first (what is this?), then history (what did the provider say?),
 * then live divergence (does the provider still agree?).
 */
export function diagnose(input: DiagnosisInput): ReconciliationReport {
  const { subscription: sub, events, provider } = input;
  const now = input.now ?? new Date();

  const classification = classifySubscription(sub);
  const lifecycle = resolveLifecycle(sub, now);

  const applied = events.filter(isApplied);
  const ignoredStale = events.filter((event) => event.outcome === "ignored_stale");
  const unmatched = events.filter((event) => event.outcome === "no_subscription");
  const unrecognized = events.filter((event) => event.outcome === "unrecognized_product");
  const latest = [...events].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];

  const anomalies: Anomaly[] = [];
  const add = (
    code: AnomalyCode,
    severity: AnomalySeverity,
    summary: string,
    requiresReconciliation: boolean,
    evidence?: Anomaly["evidence"],
  ) => anomalies.push({ code, severity, summary, requiresReconciliation, evidence });

  /* --- identity ---------------------------------------------------------- */

  if (lifecycle.state === "unknown") {
    add(
      "unknown_local_status",
      "critical",
      `The stored status "${sub.status}" is not one the lifecycle contract models, so no access decision can be made from it.`,
      true,
      { status: sub.status },
    );
  }

  if (classification.kind === "unknown") {
    add(
      "unclassified_offer",
      PAID_STATUSES.has(sub.status) ? "warning" : "info",
      "The commercial offer behind this subscription was never identified, so entitlements fall back to the conservative legacy grant.",
      PAID_STATUSES.has(sub.status),
      { productKey: sub.productKey, offerKey: sub.offerKey },
    );
  }

  if (PAID_STATUSES.has(sub.status) && !sub.providerSubscriptionId && !sub.adminOverride) {
    add(
      "missing_correlation_id",
      "critical",
      "This subscription claims paid or trialing access but holds no provider subscription id, so no future provider event can find it.",
      true,
      { status: sub.status, provider: sub.paymentProvider },
    );
  }

  if (lifecycle.state === "unconfirmed") {
    add(
      "entitlement_without_provider_confirmation",
      "critical",
      "Local state reads as paid, but no payment provider ever confirmed it — access is being withheld until it does.",
      true,
      { provider: sub.paymentProvider },
    );
  }

  /* --- event history ----------------------------------------------------- */

  if (unmatched.length > 0) {
    add(
      "unmatched_provider_events",
      "critical",
      `${unmatched.length} provider event(s) could not be attached to any subscriber — money may have moved with no local owner.`,
      true,
      { count: unmatched.length, latest: maskCorrelationId(unmatched[0].providerEventId) },
    );
  }

  if (unrecognized.length > 0) {
    add(
      "unrecognized_product_events",
      "critical",
      `${unrecognized.length} provider event(s) carried a product id missing from configuration and were deliberately not applied.`,
      true,
      { count: unrecognized.length },
    );
  }

  const duplicates = findDuplicates(events);
  if (duplicates.length > 0) {
    add(
      "duplicate_applied_events",
      "warning",
      `${duplicates.length} provider object(s) had the same event type applied more than once in this window.`,
      false,
      { kinds: duplicates.length },
    );
  }

  if (PAID_STATUSES.has(sub.status) && applied.length === 0 && !sub.adminOverride) {
    add(
      "missing_provider_events",
      "warning",
      "No provider event in this window was ever applied to this subscription, yet it holds paid or trialing state.",
      false,
      { status: sub.status, considered: events.length },
    );
  }

  if (hasStaleOrdering(sub, events)) {
    add(
      "stale_event_ordering",
      "warning",
      "The most recent provider delivery was refused as older than the state already stored, so local state may be ahead of the provider's last word.",
      false,
      { refused: ignoredStale.length },
    );
  }

  /* --- live provider divergence ------------------------------------------ */

  if (provider) {
    const mapped = provider.status ? polarStatusToLocal(provider.status) : null;
    if (provider.status && !mapped) {
      add(
        "provider_status_divergence",
        "warning",
        `The provider reports a status ("${provider.status}") this system does not model, so local state was left untouched.`,
        true,
        { providerStatus: provider.status },
      );
    } else if (mapped && mapped !== sub.status) {
      add(
        "provider_status_divergence",
        "critical",
        `The provider considers this subscription "${mapped.toLowerCase()}" while local state says "${sub.status.toLowerCase()}".`,
        true,
        { providerStatus: mapped, localStatus: sub.status },
      );
    }

    const localEnd = sub.currentPeriodEnd?.getTime() ?? null;
    const providerEnd = provider.currentPeriodEnd?.getTime() ?? null;
    if (providerEnd !== null && providerEnd !== localEnd) {
      add(
        "provider_period_divergence",
        // A provider window that ends later than ours only ever under-grants;
        // one that ends earlier means we are delivering past what was paid for.
        localEnd !== null && providerEnd < localEnd ? "critical" : "warning",
        "The access window the provider reports does not match the one stored locally.",
        true,
        {
          providerPeriodEnd: provider.currentPeriodEnd?.toISOString() ?? null,
          localPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
        },
      );
    }

    if (
      provider.cancelAtPeriodEnd !== null &&
      Boolean(provider.cancelAtPeriodEnd) !== Boolean(sub.cancelAtPeriodEnd)
    ) {
      add(
        "provider_status_divergence",
        "warning",
        provider.cancelAtPeriodEnd
          ? "The provider has this subscription cancelling at period end; local state does not."
          : "Local state has this subscription cancelling at period end; the provider does not.",
        true,
        { providerCancelAtPeriodEnd: String(Boolean(provider.cancelAtPeriodEnd)) },
      );
    }
  }

  /* --- conclusion -------------------------------------------------------- */

  const blocking = anomalies.filter((anomaly) => anomaly.requiresReconciliation);
  const worst = [...blocking].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  )[0];

  return {
    subscriptionId: sub.id,
    productKey: sub.productKey,
    offer: {
      offerKey: sub.offerKey,
      plan: sub.plan,
      grants: classification.grants,
      grandfathered: classification.grandfathered,
      evidence: classification.evidence,
    },
    billing: {
      status: sub.status,
      stateUpdatedAt: sub.billingStateUpdatedAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
      emailDeliveryStatus: sub.emailDeliveryStatus,
    },
    entitlement: {
      state: lifecycle.state,
      entitled: lifecycle.entitled,
      reason: lifecycle.reason,
      effectiveUntil: lifecycle.effectiveUntil,
    },
    correlation: {
      provider: sub.paymentProvider,
      customer: maskCorrelationId(sub.providerCustomerId),
      subscription: maskCorrelationId(sub.providerSubscriptionId),
      product: maskCorrelationId(sub.providerProductId),
    },
    events: {
      considered: events.length,
      applied: applied.length,
      ignoredStale: ignoredStale.length,
      unmatched: unmatched.length,
      unrecognizedProduct: unrecognized.length,
      latestType: latest?.type ?? null,
      latestAt: latest?.createdAt ?? null,
      latestOutcome: latest?.outcome ?? null,
    },
    anomalies,
    reconciliationRequired: blocking.length > 0,
    requiredReason: worst?.code ?? null,
    recommendedAction: recommendAction(blocking, sub, provider ?? null),
  };
}

/**
 * Picks the one repair worth suggesting.
 *
 * Only suggests a repair whose inputs are already in hand. Anything that needs
 * a human to look at Polar first — an event with no owner, an unconfigured
 * product — resolves to `manual_provider_investigation` rather than to an
 * action that would write a guess into a live subscription.
 */
function recommendAction(
  blocking: readonly Anomaly[],
  sub: ReconcilableSubscription,
  provider: ProviderSnapshot | null,
): RecommendedAction | null {
  if (blocking.length === 0) return null;
  const codes = new Set(blocking.map((anomaly) => anomaly.code));

  if (codes.has("unmatched_provider_events") || codes.has("unrecognized_product_events")) {
    return "manual_provider_investigation";
  }
  if (codes.has("missing_correlation_id")) {
    return "link_provider_subscription";
  }
  if (
    provider &&
    (codes.has("provider_status_divergence") || codes.has("provider_period_divergence"))
  ) {
    return "apply_provider_snapshot";
  }
  if (codes.has("unclassified_offer") && (sub.providerProductId || provider?.productId)) {
    return "classify_offer";
  }
  return "manual_provider_investigation";
}

/**
 * Fleet-level roll-up for the events table alone.
 *
 * Used by the inspection script's summary mode, where per-subscriber diagnosis
 * would be far too much output. Anything counted here is already surfaced with
 * a reason by `diagnose` for the specific subscriber it belongs to.
 */
export function summarizeEventOutcomes(
  events: readonly Pick<ReconcilableEvent, "outcome" | "processedAt">[],
): {
  total: number;
  unprocessed: number;
  needingReconciliation: number;
  byOutcome: Record<string, number>;
} {
  const byOutcome: Record<string, number> = {};
  let unprocessed = 0;
  let needing = 0;
  for (const event of events) {
    const key = event.outcome ?? "—";
    byOutcome[key] = (byOutcome[key] ?? 0) + 1;
    if (!event.processedAt) unprocessed++;
    if (needsReconciliation(event.outcome)) needing++;
  }
  return { total: events.length, unprocessed, needingReconciliation: needing, byOutcome };
}
