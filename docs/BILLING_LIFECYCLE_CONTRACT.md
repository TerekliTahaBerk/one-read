# Billing lifecycle → entitlement contract

What Polar knows about money and what OneRead does with a subscriber are two
different questions. This document is the bridge, and
[`lib/billing/lifecycle.ts`](../lib/billing/lifecycle.ts) is its executable
form: one pure function, `resolveLifecycle`, that every access decision is a
projection of.

Nothing else may re-derive these rules. `hasValidAccess`, entitlement
resolution and delivery eligibility all call into it.

## The two axes

Paid access and email consent are independent, always:

- Unsubscribing or bouncing **never** removes entitlement. The subscriber keeps
  what they paid for and can be re-subscribed without buying again.
- Cancelling or failing to pay **never** flips an email preference. When they
  come back, their consent is where they left it.

`resolveLifecycle` answers the paid axis only. `canReceiveProductEmail` crosses
it with consent and preference completeness, and reports consent *first*, so a
subscriber who asked not to be emailed is never described as a billing problem.

## State table

`now` is evaluation time; `periodEnd` is `currentPeriodEnd`; grace is
`PAST_DUE_GRACE_DAYS` (default 3) from `pastDueAt`.

| Lifecycle state | Stored `status` | Provider situation | Entitled | Delivery | Effective until | May move to |
| --- | --- | --- | --- | --- | --- | --- |
| `pending_preferences` | `PENDING_PREFERENCES` | signed up, setup unfinished | no | no | — | awaiting_payment, admin_override, expired |
| `awaiting_payment` | `PENDING_CHECKOUT` | checkout created, not paid | no | no | — | active, trialing, admin_override, expired |
| `trialing` | `TRIALING` | trial running | yes | yes | `trialEndsAt` | active, trial_expired, canceled_*, expired |
| `trial_expired` | `TRIALING` past end, or `TRIAL_EXPIRED` | trial over, no payment | no | no | — | awaiting_payment, active, admin_override, expired |
| `active` | `ACTIVE_PAID` | paying, renewing | yes | yes | `periodEnd` (open-ended if unknown) | active, cancel_at_period_end, past_due_grace, canceled_grace, expired |
| `cancel_at_period_end` | `ACTIVE_PAID` + `cancelAtPeriodEnd` | cancellation announced, period paid for | yes, until `periodEnd` | yes | `periodEnd` | active (uncancelled), canceled_*, expired |
| `past_due_grace` | `PAST_DUE` | charge failed, retries running | yes | yes | `pastDueAt + grace` | active, past_due_lapsed, canceled_grace, expired |
| `past_due_lapsed` | `PAST_DUE` | dunning exhausted | no | no | — | active, expired, canceled_expired |
| `canceled_grace` | `CANCELED` | cancelled inside a paid period | yes | yes | `periodEnd` | active, canceled_expired, expired |
| `canceled_expired` | `CANCELED` past end | cancelled, period over | no | no | — | active (resubscribe) , expired |
| `expired` | `EXPIRED` | revoked / refunded / incomplete_expired | no | no | — | awaiting_payment, active, trialing, admin_override |
| `admin_override` | `ADMIN_OVERRIDE` | comped by an operator | yes | yes | — (open-ended) | active, expired, awaiting_payment |
| `unconfirmed` | any paid status | no provider confirmed the money | no | no | — | active, trialing, awaiting_payment, expired |
| `unknown` | anything unmodelled | — | no | no | — | — |

Windows are closed at the end: entitlement holds while `now < end` and stops
exactly at `end`.

## Direction of failure

Where the provider has told us something incomplete, the contract errs toward
keeping access that was paid for and toward not inventing access nobody
confirmed. Concretely:

- **A stale `periodEnd` on a plain active row keeps access.** No cancellation
  was announced, so the likeliest reading is a late renewal webhook. Dropping a
  paying subscriber over our own delivery lag is the worse failure.
- **An announced end date is honoured without waiting for the revoke.** Once
  `cancelAtPeriodEnd` is set, `periodEnd` is a commitment, not a renewal
  marker — access stops there even if `subscription.revoked` never arrives.
- **Past due with no stamped failure time falls back to `periodEnd`.** Older
  rows, and provider updates that report `past_due` without announcing the
  transition, would otherwise lose access the instant they went past due — the
  exact opposite of a grace window. With no anchor at all, it fails closed.

## Webhook rules that keep the table true

Applied in [`lib/billing/polar.ts`](../lib/billing/polar.ts):

- **`pastDueAt` is stamped once and preserved.** Polar keeps sending
  `subscription.updated` while retrying a charge; re-stamping would slide the
  deadline forward forever, and clearing it would collapse the window to zero
  mid-grace. It is cleared only on the way *out* of past due.
- **A refunded order is never read as a payment.** The order object still
  describes how it was settled, so `paid`/`status` can look paid on the very
  event handing the money back. Revocation stays with `subscription.revoked`:
  a refund can be partial or a goodwill gesture on one invoice of a
  subscription that legitimately continues, so Polar decides whether access
  ends and tells us.
- **An unmodelled provider status never revokes access.** `polarStatusToLocal`
  returns `null` rather than defaulting, and the handler keeps existing state.
- **Events are ordered by provider time**, so a retried delivery cannot regress
  newer state.

## Where the tests live

- [`lib/billing/lifecycle.test.ts`](../lib/billing/lifecycle.test.ts) — the
  state table above, boundary instants, the two axes, the transition graph.
- [`lib/billing/polar-webhook-matrix.test.ts`](../lib/billing/polar-webhook-matrix.test.ts)
  — the deliveries that produce each state, including cancel/uncancel, dunning,
  refunds and resubscription.
- [`lib/products/entitlement-matrix.test.ts`](../lib/products/entitlement-matrix.test.ts)
  — how the states cross with offers, bundles and legacy plans.
