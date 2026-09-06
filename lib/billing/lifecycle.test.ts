/**
 * The billing → entitlement lifecycle contract, asserted as a table.
 *
 * Every row is a situation Polar can actually put a subscriber in. The point of
 * writing them as one table rather than as scattered `it`s is that the contract
 * is then readable in one screen: for each state, is there entitlement, until
 * when, and — with the email axis crossed in below — is there a delivery.
 */

import { describe, expect, it } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  LIFECYCLE_STATES,
  isAllowedTransition,
  resolveLifecycle,
  type LifecycleInput,
  type LifecycleState,
} from "@/lib/billing/lifecycle";
import { canReceiveProductEmail } from "@/lib/billing/access";
import { PAST_DUE_GRACE_DAYS } from "@/lib/options";

const NOW = new Date("2026-06-15T09:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (days: number) => new Date(NOW.getTime() + days * DAY);

function row(overrides: Partial<LifecycleInput> = {}): LifecycleInput {
  return {
    status: "ACTIVE_PAID",
    paymentProvider: "polar",
    adminOverride: false,
    trialEndsAt: null,
    currentPeriodEnd: at(10),
    pastDueAt: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

/* ============================== the state table ============================== */

interface Case {
  name: string;
  sub: LifecycleInput;
  state: LifecycleState;
  entitled: boolean;
  reason: string;
  effectiveUntil: Date | null;
}

const TABLE: readonly Case[] = [
  {
    name: "checkout created, awaiting payment",
    sub: row({ status: "PENDING_CHECKOUT", paymentProvider: null, currentPeriodEnd: null }),
    state: "awaiting_payment",
    entitled: false,
    reason: "checkout_required",
    effectiveUntil: null,
  },
  {
    name: "signed up, preferences not finished",
    sub: row({ status: "PENDING_PREFERENCES", paymentProvider: null, currentPeriodEnd: null }),
    state: "pending_preferences",
    entitled: false,
    reason: "pending_preferences",
    effectiveUntil: null,
  },
  {
    name: "active and paid",
    sub: row(),
    state: "active",
    entitled: true,
    reason: "ok",
    effectiveUntil: at(10),
  },
  {
    name: "active but the payment provider never confirmed",
    sub: row({ paymentProvider: null }),
    state: "unconfirmed",
    entitled: false,
    reason: "subscription_not_confirmed",
    effectiveUntil: null,
  },
  {
    name: "trialing, inside the trial",
    sub: row({ status: "TRIALING", trialEndsAt: at(3) }),
    state: "trialing",
    entitled: true,
    reason: "ok",
    effectiveUntil: at(3),
  },
  {
    name: "trialing, trial already over",
    sub: row({ status: "TRIALING", trialEndsAt: at(-1) }),
    state: "trial_expired",
    entitled: false,
    reason: "trial_expired",
    effectiveUntil: null,
  },
  {
    name: "past due, inside the grace window",
    sub: row({ status: "PAST_DUE", pastDueAt: at(-1) }),
    state: "past_due_grace",
    entitled: true,
    reason: "ok",
    effectiveUntil: new Date(at(-1).getTime() + PAST_DUE_GRACE_DAYS * DAY),
  },
  {
    name: "past due, grace exhausted",
    sub: row({ status: "PAST_DUE", pastDueAt: at(-(PAST_DUE_GRACE_DAYS + 1)) }),
    state: "past_due_lapsed",
    entitled: false,
    reason: "past_due_grace_ended",
    effectiveUntil: null,
  },
  {
    name: "cancel-at-period-end, still inside the paid period",
    sub: row({ cancelAtPeriodEnd: true }),
    state: "cancel_at_period_end",
    entitled: true,
    reason: "ok",
    effectiveUntil: at(10),
  },
  {
    name: "cancel-at-period-end, period end passed with no revoke event yet",
    sub: row({ cancelAtPeriodEnd: true, currentPeriodEnd: at(-1) }),
    state: "canceled_expired",
    entitled: false,
    reason: "canceled_expired",
    effectiveUntil: null,
  },
  {
    name: "canceled, still inside the period already paid for",
    sub: row({ status: "CANCELED", cancelAtPeriodEnd: true }),
    state: "canceled_grace",
    entitled: true,
    reason: "ok",
    effectiveUntil: at(10),
  },
  {
    name: "canceled and the period has ended",
    sub: row({ status: "CANCELED", currentPeriodEnd: at(-1) }),
    state: "canceled_expired",
    entitled: false,
    reason: "canceled_expired",
    effectiveUntil: null,
  },
  {
    name: "revoked by the provider (refund or hard cancellation)",
    sub: row({ status: "EXPIRED", currentPeriodEnd: at(10) }),
    state: "expired",
    entitled: false,
    reason: "access_expired",
    effectiveUntil: null,
  },
  {
    name: "reactivated after a cancellation",
    sub: row({ status: "ACTIVE_PAID", cancelAtPeriodEnd: false, currentPeriodEnd: at(20) }),
    state: "active",
    entitled: true,
    reason: "ok",
    effectiveUntil: at(20),
  },
  {
    name: "admin comp, no provider at all",
    sub: row({ status: "ADMIN_OVERRIDE", adminOverride: true, paymentProvider: null }),
    state: "admin_override",
    entitled: true,
    reason: "ok",
    effectiveUntil: null,
  },
  {
    name: "a status we do not model never grants access",
    sub: row({ status: "SOMETHING_NEW" }),
    state: "unknown",
    entitled: false,
    reason: "unknown_status",
    effectiveUntil: null,
  },
];

describe("lifecycle state table", () => {
  it.each(TABLE)("$name", ({ sub, state, entitled, reason, effectiveUntil }) => {
    const resolved = resolveLifecycle(sub, NOW);
    expect(resolved.state).toBe(state);
    expect(resolved.entitled).toBe(entitled);
    expect(resolved.reason).toBe(reason);
    expect(resolved.effectiveUntil).toEqual(effectiveUntil);
  });

  it("covers every modelled state", () => {
    const covered = new Set(TABLE.map((testCase) => testCase.state));
    const uncovered = LIFECYCLE_STATES.filter((state) => !covered.has(state));
    expect(uncovered).toEqual([]);
  });
});

/* ============================ boundary behaviour ============================ */

describe("window boundaries are closed at the end", () => {
  it("entitlement ends exactly at the announced end, not a moment after", () => {
    const end = new Date("2026-06-20T00:00:00Z");
    const canceled = row({ status: "CANCELED", currentPeriodEnd: end });

    expect(resolveLifecycle(canceled, new Date(end.getTime() - 1)).entitled).toBe(true);
    expect(resolveLifecycle(canceled, end).entitled).toBe(false);
  });

  it("grace ends exactly PAST_DUE_GRACE_DAYS after the failure", () => {
    const failedAt = new Date("2026-06-10T00:00:00Z");
    const sub = row({ status: "PAST_DUE", pastDueAt: failedAt });
    const graceEnd = new Date(failedAt.getTime() + PAST_DUE_GRACE_DAYS * DAY);

    expect(resolveLifecycle(sub, new Date(graceEnd.getTime() - 1)).entitled).toBe(true);
    expect(resolveLifecycle(sub, graceEnd).entitled).toBe(false);
  });
});

describe("late webhooks are not treated as lapses", () => {
  it("a renewing subscription keeps access when the renewal event is late", () => {
    // Period end in the past, no cancellation announced: the only sane reading
    // is that Polar has not delivered the renewal yet.
    const resolved = resolveLifecycle(row({ currentPeriodEnd: at(-2) }), NOW);
    expect(resolved.state).toBe("active");
    expect(resolved.entitled).toBe(true);
  });

  it("but an announced end date is honoured without waiting for the revoke", () => {
    const resolved = resolveLifecycle(
      row({ cancelAtPeriodEnd: true, currentPeriodEnd: at(-2) }),
      NOW,
    );
    expect(resolved.entitled).toBe(false);
  });

  it("past due with no stamped failure time falls back to the period end", () => {
    // Historical rows, and provider updates that report past_due without
    // announcing the transition, would otherwise lose access instantly.
    const resolved = resolveLifecycle(
      row({ status: "PAST_DUE", pastDueAt: null, currentPeriodEnd: at(-1) }),
      NOW,
    );
    expect(resolved.state).toBe("past_due_grace");
    expect(resolved.entitled).toBe(true);
  });

  it("past due with no anchor at all fails closed", () => {
    const resolved = resolveLifecycle(
      row({ status: "PAST_DUE", pastDueAt: null, currentPeriodEnd: null }),
      NOW,
    );
    expect(resolved.state).toBe("past_due_lapsed");
    expect(resolved.entitled).toBe(false);
  });
});

/* ====================== paid access vs email consent ====================== */

describe("the billing axis and the email axis stay independent", () => {
  const eligible = { ...row(), emailDeliveryStatus: "SUBSCRIBED", hasCompletePreferences: true };

  it("an unsubscribed subscriber is still entitled — they just get no email", () => {
    const unsubscribed = { ...eligible, emailDeliveryStatus: "UNSUBSCRIBED" };

    expect(resolveLifecycle(unsubscribed, NOW).entitled).toBe(true);
    expect(canReceiveProductEmail(unsubscribed, NOW)).toEqual({
      allowed: false,
      reason: "email_unsubscribed",
    });
  });

  it("a hard bounce suppresses delivery without touching entitlement", () => {
    const suppressed = { ...eligible, emailDeliveryStatus: "SUPPRESSED" };

    expect(resolveLifecycle(suppressed, NOW).entitled).toBe(true);
    expect(canReceiveProductEmail(suppressed, NOW).reason).toBe("email_suppressed");
  });

  it("consent is reported before billing, so a lapse is not blamed on the email", () => {
    const both = {
      ...eligible,
      emailDeliveryStatus: "UNSUBSCRIBED",
      status: "PAST_DUE",
      pastDueAt: at(-30),
    };
    expect(canReceiveProductEmail(both, NOW).reason).toBe("email_unsubscribed");
  });

  it("an entitled, subscribed, fully-configured subscriber gets the email", () => {
    expect(canReceiveProductEmail(eligible, NOW)).toEqual({ allowed: true, reason: "ok" });
  });

  it("cancel-at-period-end still receives email through the paid period", () => {
    const cancelling = { ...eligible, cancelAtPeriodEnd: true };
    expect(canReceiveProductEmail(cancelling, NOW).allowed).toBe(true);
    expect(
      canReceiveProductEmail(cancelling, new Date(at(10).getTime() + 1)).allowed,
    ).toBe(false);
  });
});

/* =========================== the transition graph =========================== */

describe("allowed transitions", () => {
  it("names only modelled states", () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of targets) {
        expect(LIFECYCLE_STATES, `${from} -> ${to}`).toContain(to);
      }
    }
  });

  it("every lifecycle position is reachable from somewhere (no orphan states)", () => {
    // `pending_preferences` is where a row starts, and `unknown`/`unconfirmed`
    // describe data we cannot act on rather than positions the provider moves a
    // subscription into — none of them is a transition target.
    const reachable = new Set(
      Object.entries(ALLOWED_TRANSITIONS)
        .filter(([from]) => from !== "unknown")
        .flatMap(([, targets]) => targets),
    );
    const orphans = LIFECYCLE_STATES.filter(
      (state) =>
        state !== "pending_preferences" &&
        state !== "unknown" &&
        state !== "unconfirmed" &&
        !reachable.has(state),
    );
    expect(orphans).toEqual([]);
  });

  it("models the reactivation path back from a cancellation", () => {
    expect(isAllowedTransition("cancel_at_period_end", "active")).toBe(true);
    expect(isAllowedTransition("canceled_grace", "active")).toBe(true);
    expect(isAllowedTransition("canceled_expired", "active")).toBe(true);
    expect(isAllowedTransition("past_due_grace", "active")).toBe(true);
  });

  it("does not model a jump straight from awaiting payment to cancelled", () => {
    expect(isAllowedTransition("awaiting_payment", "canceled_grace")).toBe(false);
  });

  it("exposes the transitions for the resolved state", () => {
    const resolved = resolveLifecycle(row({ cancelAtPeriodEnd: true }), NOW);
    expect(resolved.allowedTransitions).toEqual(ALLOWED_TRANSITIONS.cancel_at_period_end);
  });
});
