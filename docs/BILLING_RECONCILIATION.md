# Billing reconciliation and recovery

How to tell when Polar and OneRead disagree about a subscriber, what each kind
of disagreement means, and the only sanctioned way to fix one.

The governing rule: **diagnosis is automatic, repair never is.** Nothing in this
system corrects billing state on its own. A person reads a diagnosis, chooses one
named action, previews exactly which fields move, and applies it.

---

## Why divergence happens at all

Polar owns the money; the local `ProductSubscription` row owns access. They are
kept in step by webhooks, and a webhook can be:

- **lost** — nothing arrives, local state stays behind indefinitely;
- **reordered** — an older delivery lands after a newer one and is refused as
  stale, so the provider's last word is discarded;
- **unattributable** — it names a customer we cannot match to any local row
  (`no_subscription`), which means money may have moved with no local owner;
- **unrecognised** — it carries a Polar product id missing from configuration
  (`unrecognized_product`), so it is deliberately not applied.

None of these are errors to retry: a retry reaches the same conclusion. They are
a queue for a person.

---

## Diagnose

```bash
npm run reconcile:billing
```

Fleet sweep. Prints event outcome counts, anomaly counts by kind, and the ids of
every subscription that needs a person. Exits non-zero when the list is
non-empty, so it can be a health check.

```bash
npm run reconcile:billing -- --email=someone@example.com
npm run reconcile:billing -- --subscription=<ProductSubscription id>
```

Full diagnosis of one subject: the offer and how confidently it was identified,
billing status and its provider clock, entitlement state and reason, masked
correlation ids, the events that landed, and every anomaly with the reason
reconciliation is required.

The email is a **lookup key only**. It is never printed. Provider ids come back
masked (`pola…f123`) — enough to match a row in the Polar dashboard by eye, not
enough to matter in a screenshot. The output is safe to paste into a ticket.

Both modes are read-only. Neither can write.

### What the anomalies mean

| Code | What happened | Typical fix |
| --- | --- | --- |
| `unmatched_provider_events` | Provider events named this customer but matched no local subscriber. Money may have moved with nothing granted. | Find the customer in Polar; usually `link_provider_subscription`, sometimes a missing signup. |
| `unrecognized_product_events` | An event carried a product id missing from configuration. | Configure the product id, then replay or apply a snapshot. |
| `missing_correlation_id` | A paid or trialing row holds no provider subscription id, so no future event can ever find it. | `link_provider_subscription` |
| `entitlement_without_provider_confirmation` | Local state reads as paid, but no provider confirmed it. Access is being withheld. | Confirm in Polar, then `apply_provider_snapshot`. |
| `unclassified_offer` | The commercial offer was never identified, so entitlement falls back to the conservative legacy grant (see `lib/products/classification.ts`). | `classify_offer` |
| `provider_status_divergence` | Polar and local state disagree about status or cancellation. | `apply_provider_snapshot` |
| `provider_period_divergence` | The access windows disagree. Critical when the provider's window ends *earlier* — we are delivering past what was paid for. | `apply_provider_snapshot` |
| `stale_event_ordering` | The most recent delivery was refused as older than stored state; local state may be ahead of the provider's last word. | Read Polar, then `apply_provider_snapshot` if they still disagree. |
| `duplicate_applied_events` | One provider object had the same event type applied more than once. | Usually benign; investigate if it coincides with double billing. |
| `missing_provider_events` | Paid state with no applied event behind it in the window. | Often just an old subscription; check the window before acting. |
| `unknown_local_status` | The stored status is not one the lifecycle contract models, so no access decision can be made from it. | Investigate; this is a local bug, not a provider one. |

A live provider snapshot is optional throughout — the whole report is
produceable from local data alone, because the first thing you need during a
Polar incident is exactly the thing that cannot call Polar.

---

## Repair

```bash
# dry run — writes nothing
npm run repair:billing -- --subscription=<id> --action=<action> --reason="..."

# apply
npm run repair:billing -- --subscription=<id> --action=<action> --reason="..." \
  --actor="you" --apply --confirm=<id>
```

`--confirm` must repeat the subscription id. That is what stops a command
recalled from shell history from firing at a different subscriber.

### The four actions

- **`apply_provider_snapshot`** — reads the live Polar subscription and makes
  local status, cancellation flag and period end agree with it.
- **`link_provider_subscription`** — fills an *empty* correlation slot with
  `--provider-subscription=<id>`. It refuses to re-point a slot that is already
  set; moving a live correlation is an investigation, not a repair.
- **`classify_offer`** — records the offer a subscription was bought under, from
  provider product evidence. Only ever strengthens what is stored.
- **`clear_stale_checkout`** — drops a checkout session that has expired. Refuses
  while the session is still resumable, which would strand someone mid-purchase.

### The guarantees

1. **Explicit.** One named action, one subscription id. There is no "fix
   everything that looks wrong" entry point.
2. **Preconditions.** Every action states what must be true and refuses with a
   named reason otherwise. A refusal writes nothing.
3. **Dry-run by default.** The plan a dry run prints is the same object the apply
   path executes — what you review is what runs.
4. **Idempotent.** Re-running a repair that already landed is `no_change`, not a
   second write. Retries are free.
5. **Never overwrites newer state.** Writes are compare-and-set on
   `billingStateUpdatedAt`, exactly as the webhook path is. A webhook that lands
   mid-repair is provider truth and wins; the repair is discarded with
   `lost_to_newer_state` and you re-diagnose.
6. **Audited.** Every applied repair writes a `BillingEvent` with provider
   `operator` and type `repair.<action>`, carrying the actor, the reason and the
   before/after fields — and no email address. It appears in
   `/admin/system/webhooks` in the same timeline as the provider events it was
   reacting to.

### What repair deliberately cannot do

There is no action that grants entitlement, extends a period, or invents a
provider subscription id. A repair may only make local state agree with evidence
the provider has already produced. Comping access is `adminOverride` — a
separate, visible decision.

An unmodelled provider status is **refused**, not defaulted. The provider adding
a status value we have never seen must never be interpreted as "not paying".

---

## Where the logic lives

| Concern | Module |
| --- | --- |
| Diagnosis (pure; no I/O, no clock of its own) | `lib/billing/reconciliation.ts` |
| Repair (preconditions, guards, audit) | `lib/billing/repair.ts` |
| Lifecycle → entitlement contract | `lib/billing/lifecycle.ts`, `docs/BILLING_LIFECYCLE_CONTRACT.md` |
| Webhook state machine and outcomes | `lib/billing/polar.ts` |
| Offer identification | `lib/products/classification.ts` |

Diagnosis is pure on purpose: every anomaly listed above is reproducible from a
fixture in `lib/billing/reconciliation.test.ts`, and diagnosis can never mutate
the thing it is diagnosing.

> Local scripts read the production database (there is no staging DB, and Prisma
> loads `.env` ahead of an injected `DATABASE_URL`). The diagnosis commands are
> read-only; `repair:billing` writes only under `--apply --confirm`.
