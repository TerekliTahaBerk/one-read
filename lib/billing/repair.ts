/**
 * Billing repair — the only sanctioned way to write reconciled state by hand.
 *
 * ── The rule this module exists to enforce ──────────────────────────────────
 * Reconciliation is never automatic and never blind. `lib/billing/reconciliation.ts`
 * says what diverged; this module applies exactly one named correction, chosen
 * by a person, under preconditions that are re-checked at the moment of the
 * write. Nothing here scans, sweeps, or fixes "everything that looks wrong".
 *
 * ── The five guarantees ─────────────────────────────────────────────────────
 * 1. **Explicit action.** A caller names one action and one subscription. There
 *    is no "repair whatever is broken" entry point, because that is the shape
 *    that turns one bad inference into a fleet-wide incident.
 * 2. **Preconditions.** Every action states what must be true and refuses with
 *    a named reason otherwise. A refusal writes nothing.
 * 3. **Dry-run.** `dryRun` is the default. The plan a dry run prints is the
 *    same object the apply path executes, so what an operator reviews is what
 *    actually runs.
 * 4. **Idempotence.** Re-running a repair that already landed is a `no_change`
 *    outcome, not a second write. Operators retry; retries must be free.
 * 5. **Never overwrite newer state.** Writes are compare-and-set on
 *    `billingStateUpdatedAt`, exactly as the webhook path is: a repair carrying
 *    an older provider clock than the row already holds loses, and says so.
 *    A webhook that lands mid-repair is provider truth and must win.
 *
 * ── Audit ───────────────────────────────────────────────────────────────────
 * Every applied repair writes a BillingEvent with provider `"operator"`. That
 * table is already the billing audit log, it is already surfaced in
 * /admin/system/webhooks, and reusing it means a repair appears in the same
 * timeline as the provider events it was reacting to — which is the only place
 * anyone would think to look. The stored payload holds the action, the actor,
 * the before/after fields and the reason; it never holds an email address.
 *
 * ── What is deliberately absent ─────────────────────────────────────────────
 * There is no action that grants entitlement outright, extends a period, or
 * invents a provider subscription id. Comping access is what `adminOverride`
 * is for, and it is a separate, visible decision. A repair may only make local
 * state agree with evidence the provider has already produced.
 */

import { prisma } from "@/lib/prisma";
import { polarStatusToLocal } from "@/lib/billing/polar";
import { improveClassification } from "@/lib/products/classification";
import type { ProviderSnapshot, ReconcilableSubscription } from "@/lib/billing/reconciliation";

/** The corrections an operator may ask for, by name. */
export const REPAIR_ACTIONS = [
  /** Attach a provider subscription id to a row that has none. */
  "link_provider_subscription",
  /** Record the offer/product a live subscription was actually bought under. */
  "classify_offer",
  /** Make local billing state agree with a fetched provider snapshot. */
  "apply_provider_snapshot",
  /** Drop a checkout session that can no longer be resumed. */
  "clear_stale_checkout",
] as const;

export type RepairAction = (typeof REPAIR_ACTIONS)[number];

export function isRepairAction(value: unknown): value is RepairAction {
  return typeof value === "string" && (REPAIR_ACTIONS as readonly string[]).includes(value);
}

/** Why a repair did not happen. Each is a decision, never an error to retry. */
export type RepairRefusal =
  /** The named subscription does not exist. */
  | "no_subscription"
  /** The action's preconditions are not met on this row. */
  | "precondition_failed"
  /** The action needs a provider snapshot and none was supplied. */
  | "provider_snapshot_required"
  /** The snapshot is older than the state the row already holds. */
  | "stale_provider_snapshot"
  /** The provider reported something this system does not model. */
  | "unmodelled_provider_status"
  /** The evidence offered would weaken, not strengthen, what is stored. */
  | "not_an_improvement"
  /** A concurrent newer write won the compare-and-set. */
  | "lost_to_newer_state";

export type RepairOutcome =
  /** The change was written (or would be, in a dry run). */
  | "applied"
  /** The row already matches the target. Nothing was written. */
  | "no_change"
  /** Preconditions or guards refused. Nothing was written. */
  | "refused";

/** The exact field-level change a repair intends. Reviewable before it runs. */
export interface RepairPlan {
  action: RepairAction;
  subscriptionId: string;
  /** Fields as they are now, limited to the ones the action would touch. */
  before: Readonly<Record<string, unknown>>;
  /** Fields as they would become. */
  after: Readonly<Record<string, unknown>>;
  /** Provider clock the write is gated on, when the action has one. */
  providerClock: Date | null;
  /** One sentence an operator can read before approving. */
  summary: string;
}

export interface RepairResult {
  outcome: RepairOutcome;
  action: RepairAction;
  subscriptionId: string;
  dryRun: boolean;
  plan: RepairPlan | null;
  refusal: RepairRefusal | null;
  /** Plain-English explanation of the outcome. Never contains PII. */
  detail: string;
  /** BillingEvent.providerEventId of the audit record, when one was written. */
  auditId: string | null;
}

export interface RepairRequest {
  action: RepairAction;
  /** ProductSubscription.id. Repairs address one row, never a query. */
  subscriptionId: string;
  /** Who asked for this. Recorded in the audit trail; not an email. */
  actor: string;
  /** Free-text justification, stored with the audit record. */
  reason: string;
  /** Defaults to true: nothing is written unless the caller opts out. */
  dryRun?: boolean;
  /** Required by `apply_provider_snapshot`; optional evidence elsewhere. */
  provider?: ProviderSnapshot | null;
  /** Required by `link_provider_subscription`. */
  providerSubscriptionId?: string | null;
  now?: Date;
}

/* ============================== plan builders ============================== */

type PlanOrRefusal =
  | { kind: "plan"; plan: RepairPlan; data: Record<string, unknown> }
  | { kind: "no_change"; detail: string }
  | { kind: "refused"; refusal: RepairRefusal; detail: string };

function planLinkProviderSubscription(
  sub: ReconcilableSubscription,
  request: RepairRequest,
): PlanOrRefusal {
  const incoming = request.providerSubscriptionId?.trim();
  if (!incoming) {
    return {
      kind: "refused",
      refusal: "precondition_failed",
      detail: "Linking a provider subscription requires the provider subscription id to link.",
    };
  }
  if (sub.providerSubscriptionId?.trim() === incoming) {
    return { kind: "no_change", detail: "This provider subscription is already linked." };
  }
  // Re-pointing a live correlation would silently move a *different* customer's
  // provider subscription onto this row. Only an empty slot may be filled.
  if (sub.providerSubscriptionId) {
    return {
      kind: "refused",
      refusal: "precondition_failed",
      detail:
        "This subscription already points at a different provider subscription. Re-pointing a live correlation is not a repair; investigate in Polar first.",
    };
  }
  if (sub.paymentProvider && sub.paymentProvider !== "polar") {
    return {
      kind: "refused",
      refusal: "precondition_failed",
      detail: `This row is recorded against the "${sub.paymentProvider}" provider, so a Polar subscription id does not belong on it.`,
    };
  }

  return {
    kind: "plan",
    data: { providerSubscriptionId: incoming, paymentProvider: "polar" },
    plan: {
      action: "link_provider_subscription",
      subscriptionId: sub.id,
      before: { providerSubscriptionId: null, paymentProvider: sub.paymentProvider },
      after: { providerSubscriptionId: incoming, paymentProvider: "polar" },
      providerClock: null,
      summary:
        "Attach the provider subscription id so future provider events can find this subscriber.",
    },
  };
}

function planClassifyOffer(
  sub: ReconcilableSubscription,
  request: RepairRequest,
): PlanOrRefusal {
  const observed = request.provider?.productId ?? sub.providerProductId ?? null;
  const improvement = improveClassification(sub, observed);

  if (!improvement.improved) {
    if (improvement.reason === "unidentifiable") {
      return {
        kind: "refused",
        refusal: "precondition_failed",
        detail:
          "The observed product id is not one of ours. Configure the product before classifying this subscription.",
      };
    }
    return {
      kind: "no_change",
      detail: "The stored classification is already at least as strong as this evidence.",
    };
  }

  return {
    kind: "plan",
    data: { ...improvement.data },
    plan: {
      action: "classify_offer",
      subscriptionId: sub.id,
      before: { offerKey: sub.offerKey, providerProductId: sub.providerProductId },
      after: { ...improvement.data },
      providerClock: null,
      summary:
        "Record the offer this subscription was actually bought under, so entitlements stop falling back to the conservative legacy grant.",
    },
  };
}

/**
 * The one action that moves billing state. Everything about it is defensive:
 * an unmodelled provider status is refused rather than defaulted, the snapshot
 * must be at least as new as the state we hold, and the write itself is gated
 * on that same clock.
 */
function planApplyProviderSnapshot(
  sub: ReconcilableSubscription,
  request: RepairRequest,
): PlanOrRefusal {
  const snapshot = request.provider;
  if (!snapshot) {
    return {
      kind: "refused",
      refusal: "provider_snapshot_required",
      detail: "This repair applies provider truth, so a provider snapshot must be supplied.",
    };
  }
  if (!snapshot.status) {
    return {
      kind: "refused",
      refusal: "provider_snapshot_required",
      detail: "The provider snapshot carries no status, so there is nothing authoritative to apply.",
    };
  }

  const mapped = polarStatusToLocal(snapshot.status);
  if (!mapped) {
    return {
      kind: "refused",
      refusal: "unmodelled_provider_status",
      detail: `The provider reports "${snapshot.status}", which this system does not model. Local state is left untouched rather than guessed at.`,
    };
  }

  if (
    sub.billingStateUpdatedAt &&
    snapshot.observedAt.getTime() < sub.billingStateUpdatedAt.getTime()
  ) {
    return {
      kind: "refused",
      refusal: "stale_provider_snapshot",
      detail:
        "The snapshot is older than the billing state already stored. Re-read the provider before repairing.",
    };
  }

  const nextCancel = Boolean(snapshot.cancelAtPeriodEnd);
  const nextPeriodEnd = snapshot.currentPeriodEnd ?? sub.currentPeriodEnd;
  const unchanged =
    mapped === sub.status &&
    nextCancel === Boolean(sub.cancelAtPeriodEnd) &&
    (nextPeriodEnd?.getTime() ?? null) === (sub.currentPeriodEnd?.getTime() ?? null);

  if (unchanged) {
    return { kind: "no_change", detail: "Local billing state already matches the provider." };
  }

  const data: Record<string, unknown> = {
    status: mapped,
    cancelAtPeriodEnd: nextCancel,
    currentPeriodEnd: nextPeriodEnd,
    billingStateUpdatedAt: snapshot.observedAt,
    paymentProvider: sub.paymentProvider ?? "polar",
  };

  // Keep the derived timestamps consistent with the status being written, using
  // the same rules the webhook path uses: stamp on entry, clear on recovery.
  if (mapped === "PAST_DUE") data.pastDueAt = sub.pastDueAt ?? snapshot.observedAt;
  if (mapped === "ACTIVE_PAID") data.pastDueAt = null;
  if (mapped === "CANCELED") data.canceledAt = snapshot.observedAt;

  return {
    kind: "plan",
    data,
    plan: {
      action: "apply_provider_snapshot",
      subscriptionId: sub.id,
      before: {
        status: sub.status,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
        currentPeriodEnd: sub.currentPeriodEnd,
        billingStateUpdatedAt: sub.billingStateUpdatedAt,
      },
      after: {
        status: mapped,
        cancelAtPeriodEnd: nextCancel,
        currentPeriodEnd: nextPeriodEnd,
        billingStateUpdatedAt: snapshot.observedAt,
      },
      providerClock: snapshot.observedAt,
      summary: `Move local billing state to "${mapped}" to match what the provider reports.`,
    },
  };
}

function planClearStaleCheckout(
  sub: ReconcilableSubscription & {
    providerCheckoutSessionId?: string | null;
    providerCheckoutUrl?: string | null;
    providerCheckoutExpiresAt?: Date | null;
  },
  now: Date,
): PlanOrRefusal {
  if (!sub.providerCheckoutSessionId && !sub.providerCheckoutUrl) {
    return { kind: "no_change", detail: "There is no stored checkout session to clear." };
  }
  const expiresAt = sub.providerCheckoutExpiresAt ?? null;
  if (expiresAt && expiresAt > now) {
    return {
      kind: "refused",
      refusal: "precondition_failed",
      detail:
        "The stored checkout session has not expired. Clearing it would strand a subscriber mid-purchase.",
    };
  }

  return {
    kind: "plan",
    data: {
      providerCheckoutSessionId: null,
      providerCheckoutUrl: null,
      providerCheckoutExpiresAt: null,
    },
    plan: {
      action: "clear_stale_checkout",
      subscriptionId: sub.id,
      before: {
        providerCheckoutSessionId: sub.providerCheckoutSessionId ?? null,
        providerCheckoutExpiresAt: expiresAt,
      },
      after: { providerCheckoutSessionId: null, providerCheckoutExpiresAt: null },
      providerClock: null,
      summary: "Drop the expired checkout session so the next attempt opens a fresh one.",
    },
  };
}

/* ================================ execution =============================== */

const AUDIT_PROVIDER = "operator";

function auditEventId(action: RepairAction, subscriptionId: string, at: Date): string {
  return `${AUDIT_PROVIDER}:repair.${action}:${subscriptionId}:${at.toISOString()}`;
}

/**
 * Runs one named repair against one subscription.
 *
 * Dry-run by default. The returned plan is the review artifact: an operator
 * reads `before`/`after`, then re-runs the identical request with
 * `dryRun: false`. Nothing about the decision is recomputed differently on the
 * apply path — the same builders produce the same plan, and only the write and
 * the audit record are added.
 */
export async function repairSubscription(request: RepairRequest): Promise<RepairResult> {
  const dryRun = request.dryRun !== false;
  const now = request.now ?? new Date();

  const base: Omit<RepairResult, "outcome" | "plan" | "refusal" | "detail"> = {
    action: request.action,
    subscriptionId: request.subscriptionId,
    dryRun,
    auditId: null,
  };

  const sub = (await prisma.productSubscription.findUnique({
    where: { id: request.subscriptionId },
  })) as (ReconcilableSubscription & Record<string, unknown>) | null;

  if (!sub) {
    return {
      ...base,
      outcome: "refused",
      plan: null,
      refusal: "no_subscription",
      detail: "No subscription with that id exists.",
    };
  }

  let planned: PlanOrRefusal;
  switch (request.action) {
    case "link_provider_subscription":
      planned = planLinkProviderSubscription(sub, request);
      break;
    case "classify_offer":
      planned = planClassifyOffer(sub, request);
      break;
    case "apply_provider_snapshot":
      planned = planApplyProviderSnapshot(sub, request);
      break;
    case "clear_stale_checkout":
      planned = planClearStaleCheckout(sub, now);
      break;
  }

  if (planned.kind === "refused") {
    return {
      ...base,
      outcome: "refused",
      plan: null,
      refusal: planned.refusal,
      detail: planned.detail,
    };
  }
  if (planned.kind === "no_change") {
    return { ...base, outcome: "no_change", plan: null, refusal: null, detail: planned.detail };
  }

  if (dryRun) {
    return {
      ...base,
      outcome: "applied",
      plan: planned.plan,
      refusal: null,
      detail: `Dry run — no write performed. ${planned.plan.summary}`,
    };
  }

  // Compare-and-set on the provider clock, mirroring the webhook path. A repair
  // is by definition slower than the provider: if a real event landed between
  // this read and this write, the event is truth and the repair must lose.
  const clock = planned.plan.providerClock;
  const written = await prisma.productSubscription.updateMany({
    where: clock
      ? {
          id: sub.id,
          OR: [{ billingStateUpdatedAt: null }, { billingStateUpdatedAt: { lte: clock } }],
        }
      : { id: sub.id },
    data: planned.data as never,
  });

  if (written.count === 0) {
    return {
      ...base,
      outcome: "refused",
      plan: planned.plan,
      refusal: "lost_to_newer_state",
      detail:
        "A newer billing state was written while this repair was being prepared, so the repair was discarded. Re-diagnose before retrying.",
    };
  }

  const auditId = auditEventId(request.action, sub.id, now);
  await prisma.billingEvent.create({
    data: {
      provider: AUDIT_PROVIDER,
      providerEventId: auditId,
      type: `repair.${request.action}`,
      // No email, no raw payload: the plan already names only the fields moved.
      payload: {
        actor: request.actor,
        reason: request.reason,
        subscriptionId: sub.id,
        before: serializable(planned.plan.before),
        after: serializable(planned.plan.after),
      } as never,
      processedAt: now,
      outcome: "applied",
    },
  });

  return {
    ...base,
    outcome: "applied",
    plan: planned.plan,
    refusal: null,
    detail: planned.plan.summary,
    auditId,
  };
}

/** Dates to ISO strings so the audit payload round-trips through JSON. */
function serializable(fields: Readonly<Record<string, unknown>>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value instanceof Date ? value.toISOString() : (value ?? null);
  }
  return out;
}
