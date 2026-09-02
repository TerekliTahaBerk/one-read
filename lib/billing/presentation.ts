/**
 * Human-readable billing state, derived once and shared by every surface.
 *
 * Admin and My OneRead must never disagree about what somebody is paying for.
 * The specific mislabelling this exists to prevent: showing a grandfathered $1
 * subscriber the words "OneRead bundle" because their row happens to carry
 * `productKey = "one-read"`, which is also the key the current $4 bundle uses.
 *
 * Labels only — no access decisions are made here. Entitlements come from
 * lib/products/entitlements.ts.
 */

import {
  classifySubscription,
  type ClassifiableSubscription,
} from "@/lib/products/classification";
import { PRODUCTS, type ProductKey } from "@/lib/products/registry";

/** Lifecycle as an operator or subscriber should read it. */
export type BillingLifecycleLabel =
  | "Active"
  | "Canceling at period end"
  | "Change pending"
  | "Past due"
  | "Canceled"
  | "Expired"
  | "Awaiting checkout"
  | "Trialing"
  | "Admin override"
  | "Setting up";

export interface BillingPresentation {
  /** What they bought, e.g. "OneRead" or "OneRead (legacy $1 umbrella)". */
  offerLabel: string;
  /** Monthly / Annual / Legacy — never invented. */
  intervalLabel: string;
  /** Editorial products this purchase grants. */
  grantsLabel: string;
  grants: readonly ProductKey[];
  lifecycle: BillingLifecycleLabel;
  grandfathered: boolean;
  /** True when we cannot name the offer and are granting the safe minimum. */
  unidentified: boolean;
}

export interface PresentableSubscription extends ClassifiableSubscription {
  status: string;
  cancelAtPeriodEnd?: boolean | null;
  adminOverride?: boolean | null;
}

function lifecycleLabel(
  sub: PresentableSubscription,
  hasPendingChange: boolean,
): BillingLifecycleLabel {
  if (hasPendingChange) return "Change pending";
  if (sub.adminOverride || sub.status === "ADMIN_OVERRIDE") return "Admin override";
  switch (sub.status) {
    case "ACTIVE_PAID":
      return sub.cancelAtPeriodEnd ? "Canceling at period end" : "Active";
    case "TRIALING":
      return "Trialing";
    case "PAST_DUE":
      return "Past due";
    case "CANCELED":
      return "Canceled";
    case "EXPIRED":
    case "TRIAL_EXPIRED":
      return "Expired";
    case "PENDING_CHECKOUT":
      return "Awaiting checkout";
    default:
      return "Setting up";
  }
}

const INTERVAL_LABELS: Record<string, string> = {
  monthly: "Monthly",
  annual: "Annual",
};

export function presentBilling(
  sub: PresentableSubscription,
  options: { hasPendingChange?: boolean } = {},
): BillingPresentation {
  const classification = classifySubscription(sub);

  const grants = classification.grants;
  const grantsLabel =
    grants.length === 0
      ? "No product access"
      : grants.map((product) => PRODUCTS[product].displayName).join(" + ");

  return {
    offerLabel: classification.displayName,
    intervalLabel: classification.interval
      ? INTERVAL_LABELS[classification.interval]
      : // Historical rows often predate interval tracking. Say so rather than
        // guessing "Monthly", which would misstate what somebody is charged.
        "Not recorded",
    grantsLabel,
    grants,
    lifecycle: lifecycleLabel(sub, options.hasPendingChange === true),
    grandfathered: classification.grandfathered,
    unidentified: classification.kind === "unknown",
  };
}

/** Short operator badge, e.g. "Legacy $1 · OneArticle access". */
export function operatorBillingSummary(sub: PresentableSubscription): string {
  const presented = presentBilling(sub);
  const prefix = presented.grandfathered ? "Legacy" : "Current";
  return `${prefix} · ${presented.offerLabel} · ${presented.grantsLabel}`;
}
