# Billing configuration (Milestone C)

OneRead sells three offers, each on monthly or annual billing. Polar remains the
billing source of truth; this document lists the configuration the application
needs and the guarantees that configuration carries.

## Commercial matrix

| Offer | Grants | Monthly | Annual | Annual saving |
| --- | --- | --- | --- | --- |
| OneArticle | OneArticle | $2 | $18 | $6 |
| OneNews | OneNews | $3 | $27 | $9 |
| OneRead bundle | OneArticle + OneNews | $4 | $36 | $12 |

Prices are USD and are defined once, in `lib/products/registry.ts`. Nothing else
may hard-code them — the pricing page derives both the amounts and the annual
saving from the registry.

## Required environment variables

Each offer/interval pair maps to one Polar product id:

```
POLAR_ONE_ARTICLE_MONTHLY_PRODUCT_ID
POLAR_ONE_ARTICLE_ANNUAL_PRODUCT_ID
POLAR_ONE_NEWS_MONTHLY_PRODUCT_ID
POLAR_ONE_NEWS_ANNUAL_PRODUCT_ID
POLAR_ONE_READ_MONTHLY_PRODUCT_ID
POLAR_ONE_READ_ANNUAL_PRODUCT_ID
```

These are **not** secrets, but they are environment-specific. A preview or
sandbox deployment must point at sandbox Polar products; `POLAR_SERVER`
(`sandbox` | `production`) selects the API and is independent of these ids, so
setting production ids with a sandbox server — or the reverse — is a
misconfiguration the application cannot detect for you.

### Fail-closed behaviour

`resolveCheckoutProductId(offer, interval)` throws
`MissingPolarOfferConfigError` naming the exact missing variable. It never falls
back to another offer, another interval, or a legacy product. An unconfigured
offer therefore cannot bill a customer for the wrong thing; it simply cannot be
purchased until configured.

`missingOfferConfig()` returns every unset variable, for a startup or admin
health check.

## Legacy (grandfathered) products

Two historical Polar products remain live for existing subscribers:

| Variable | Plan | Grants |
| --- | --- | --- |
| `POLAR_ONEREAD_PRODUCT_ID` | Legacy $1 OneRead umbrella | OneArticle **only** |
| `POLAR_ONE_ARTICLE_PRODUCT_ID` | Legacy standalone OneArticle | OneArticle |

Both are resolved through `legacyProductIdFor(legacyKey)` in
`lib/products/polar-config.ts`. `lib/billing/polar.ts` no longer reads either
variable itself, so the inbound reconciliation path and the registry can no
longer disagree about which product a legacy plan is billed against. Resolution
is fail-closed: an unconfigured legacy plan throws naming its variable rather
than substituting the other legacy product, which is billed at a different
price.

Legacy products are **recognised inbound** (webhooks, reconciliation) so existing
subscriptions keep resolving, and are **never selectable outbound** for a new
checkout. That asymmetry is what protects grandfathered pricing, and it is
covered by tests in `lib/products/polar-config.test.ts`.

The legacy umbrella grants OneArticle only. It deliberately does not map onto
today's `one-read` bundle offer: doing so would hand every $1 subscriber OneNews
for free and misrepresent what they bought.

The original hard-coded OneArticle product id
(`44ef8bae-87eb-40eb-9a07-8b4a97e1434e`) is retained in
`lib/products/polar-config.ts` as an inbound-only fallback so live legacy
subscriptions keep resolving even if the variable is dropped. It was previously
the *checkout* fallback in `lib/billing/polar.ts`, which meant an unconfigured
deployment would silently sell the legacy product; it can no longer do so.

## Billing interval storage

`ProductSubscription.plan` stores `"monthly"` or `"annual"`. Polar's
`recurringInterval` is translated by `billingIntervalFromProviderInterval` in
the registry — the single mapping used by both the webhook handler and the
reconciliation path. An interval we do not model leaves the stored plan
untouched rather than defaulting to monthly.

## Entitlements

`lib/products/entitlements.ts` is the only place that answers "does this contact
have access to this product?". It delegates access-window semantics (trials,
past-due grace, cancel-at-period-end) to `hasValidAccess` in
`lib/billing/access.ts` and adds the offer→product mapping on top.

### Billing identity: how the `one-read` ambiguity is resolved

Three separate concepts, deliberately never collapsed into one column:

| Concept | Meaning | Where it lives |
| --- | --- | --- |
| **Product** | An editorial thing a subscriber receives (OneArticle, OneNews) | `PRODUCTS` in the registry |
| **Offer** | A commercial package that can be bought | `OFFERS` + `LEGACY_OFFERS` |
| **Provider product** | The specific Polar product/price charged | `ProductSubscription.providerProductId` |

`ProductSubscription.productKey` is only a *slot* — the row's uniqueness key. It
is not a purchase record, which is why it cannot distinguish the legacy $1
umbrella from the current $4 bundle: both use `one-read`.

Milestone C2 persists two additive fields that do carry purchase identity:

* `providerProductId` — the Polar product actually charged.
* `offerKey` — the offer we resolved that to. Current offers use registry keys;
  closed plans use their `LEGACY_OFFERS` key (e.g. `legacy-one-read-umbrella`).

`lib/products/classification.ts` is the only module that decides what a row
represents. It consults evidence strongest-first:

1. `providerProductId` — provider truth.
2. `offerKey` — our own recorded conclusion.
3. `productKey` — inference of last resort.

Evidence may only ever strengthen. `improveClassification` refuses to replace a
provider-derived identity with a weaker inference, so a later event carrying no
product id cannot erase what an earlier one established.

### Historical rows

Rows written before C2 have neither field and are **never backfilled by
guesswork**. They classify as `unknown` and receive the conservative floor
implied by `productKey`:

| `productKey` | Grants when unidentified | Grandfathered? |
| --- | --- | --- |
| `one-read` | OneArticle **only** | Yes |
| `one-article` | OneArticle | No |
| `one-news` | OneNews | No |

`one-read` is the dangerous case and is the reason for the whole mechanism: an
unidentified row is treated as the legacy umbrella, never as today's bundle.
Under-granting is recoverable through support; over-granting silently gives away
a paid product. A legacy subscriber therefore cannot receive OneNews for free
through any code path — see `lib/products/entitlement-matrix.test.ts`.

If a later webhook reveals the provider product for such a row, classification
improves automatically and permanently.

## Checkout

New purchases go through `POST /api/billing/checkout` with a body of
`{ email, offer, interval }`. The request names an **offer**, never a provider
product: `parseOfferSelection` rejects anything that is not an exact registry
value, so a browser cannot submit a Polar product id and have the server bill
against it.

New offers are sold **without a free trial**. `allowTrial` is not set on this
path. Historical trial fields on existing rows are untouched.

`POST /api/oneread/checkout` — the legacy `$1` entry point — is retired and
answers `410 legacy_checkout_retired` pointing at `/api/billing/checkout`. Its
server-side helper has been deleted rather than left dormant: a second live
checkout path is precisely how offer identity, pricing and Polar product
mapping drift apart. Legacy *reconciliation* is unaffected, because recognising
an existing subscription and selling a new one are separate directions.

### The verification boundary

Checkout requires a verified-email session that was issued **for that exact
offer and interval**. When the customer confirms their code, the plan on screen
is frozen into the signed session cookie as an opaque intent string
(`lib/billing/checkout-intent.ts`); `/api/billing/checkout` recomputes the
intent from the request body and refuses a mismatch with `409
verification_intent_mismatch`.

Proving control of an address is not the same as agreeing to a price, so a
session verified while looking at one plan cannot be spent on another. Changing
plan mid-flow is still allowed — it just costs another verification, which the
signup UI does by returning to the code step.

The session is short-lived, single-use at the code level, and never contains
the code itself. A confirmed code is consumed by a conditional write
(`consumedAt: null` in the WHERE clause), so replaying it produces no second
state transition.

### Duplicate submits and abandonment

A repeated checkout request for the same offer resumes the Polar session
already open (`providerCheckoutUrl` / `providerCheckoutExpiresAt` on
`ProductSubscription`) rather than minting a second one. The stored session is
reused only for the same provider product, only before a real subscription
exists, and only until it expires — so switching plan or coming back later
still opens a fresh session.

Abandoning a checkout grants nothing. The row is written as `PENDING_CHECKOUT`
and no code path moves it out of that state except a provider confirmation, so
an abandoned checkout can never produce an `ACTIVE_PAID` entitlement.

### Return and success URLs

In production both URLs must resolve to a canonical HTTPS origin. `checkout` in
`lib/billing/polar.ts` builds them from `PUBLIC_BASE_URL` and rejects a missing,
plaintext, or malformed origin — as well as a plaintext operator-supplied
`POLAR_*_SUCCESS_URL` / `POLAR_*_RETURN_URL`. There is no localhost fallback in
production: failing to create the checkout is safer than paying a customer out
to an unreachable redirect.

## Subscription transitions

Implemented in `lib/billing/transitions.ts`. Every supported change is an
**in-place Polar product change** on the subscriber's existing provider
subscription (`subscriptions.update({ productId, prorationBehavior })`).

That mechanism is the safety argument:

* **No access gap.** The same provider subscription stays active throughout.
* **No double billing.** No second subscription is ever created alongside the
  first, so an abandoned change cannot leave someone paying twice.
* **No local proration.** We pass a proration *behaviour*; Polar computes all
  amounts. There is no price arithmetic anywhere in the codebase.
* **Provider truth only.** Local state is written from the subscription object
  Polar returns. When the provider defers a change to the next period, the row
  correctly still reads as the old offer and the pending change is recorded in
  `SubscriptionTransition`.

| Transition | Timing | Proration behaviour |
| --- | --- | --- |
| OneArticle → bundle | Immediate | `invoice` |
| OneNews → bundle | Immediate | `invoice` |
| Legacy $1 → bundle | Immediate, **explicit acknowledgement required** | `invoice` |
| Bundle → OneArticle | Next billing period | `next_period` |
| Bundle → OneNews | Next billing period | `next_period` |
| Monthly → annual | Immediate | `invoice` |
| Annual → monthly | Next billing period | `next_period` |

Upgrades apply immediately so the new entitlement is paid for the moment it is
granted. Downgrades wait for the next period, which keeps the subscriber on the
plan they already bought and removes any need for refund or credit logic.

### Leaving a grandfathered plan

Moving off a closed legacy price destroys it permanently — an in-place product
change cannot be undone back onto a product that is no longer sold.
`previewTransition` therefore **refuses outright** unless the caller passes
`acknowledgeGrandfatherLoss`, obtained from the subscriber after showing
`GRANDFATHER_FORFEIT_WARNING`. The acknowledgement timestamp and the forfeited
legacy provider ids are recorded on the `SubscriptionTransition` row.

`POST /api/billing/plan-change` is two-step: without `confirm: true` it only
previews and mutates nothing. Nothing in ordinary webhook processing,
reconciliation or preference editing reaches this module, so a grandfathered
subscriber cannot be moved by accident.

## Webhook behaviour

`applyPolarWebhookPayload` returns a typed outcome, persisted on
`BillingEvent.outcome` for operator diagnosis:

| Outcome | Meaning |
| --- | --- |
| `applied` | Billing state updated. |
| `ignored_stale` | Older than `billingStateUpdatedAt`; refused. |
| `unrecognized_product` | Carries a Polar product we do not recognise. **Never** assumed to be the bundle; existing entitlement untouched. |
| `no_subscription` | No local row could be identified. |
| `ignored_event_type` | Not an event type this state machine models. Recorded, never applied. |

### Supported event types

`SUPPORTED_POLAR_EVENT_TYPES` in `lib/billing/polar.ts` is an explicit
allowlist, not a prefix match. Anything outside it — including a
`subscription.*` event Polar adds in future — is classified as an explicit NOOP
and audited, rather than being run through the subscription branch and written
as a lifecycle change we never designed. Adding support for a new event is a
deliberate edit to that list.

For the same reason a provider *status* we do not model resolves to `null` and
leaves the current local status in place. Defaulting an unknown status is how a
provider vocabulary change silently revokes paid access.

### Ordering and concurrency

The ordering key is the newest of the delivery timestamp and the object's own
`modifiedAt`, so ranking follows provider object version rather than delivery
order: a retry delivered an hour late cannot out-rank a newer event that already
landed, and two deliveries of the same object version compare equal and are
therefore idempotent.

The staleness guard is a **conditional write** — `updateMany` with a
`billingStateUpdatedAt` predicate — not a read followed by an unconditional
update. Under concurrent deliveries the loser is rejected by its own `WHERE`
clause and reported as `ignored_stale`.

### Reconciliation

`no_subscription` and `unrecognized_product` are listed in
`RECONCILIATION_OUTCOMES`. They are not retryable failures — a retry reaches the
same conclusion — but they are not "handled" either: money may have moved with
no local owner, or a product id may be missing from configuration. They are
counted and highlighted on `/admin/system/webhooks` rather than being silently
marked done. No mapping is ever guessed to make one go away.

### Duplicates

Duplicate deliveries are absorbed at the route by the unique
`BillingEvent.providerEventId`. An event row that exists but was never processed
is ambiguous: a crashed delivery, or an identical delivery running right now in
another instance. Age separates them — inside a one-minute window the delivery
is acknowledged without acting (the in-flight one owns the state change), and
beyond it the event is retried rather than acknowledged and lost.

Nothing is written for a payload that fails signature verification, not even an
audit row: an unauthenticated caller must not be able to grow a table.

Subscriptions are located per
`(contact, productKey)` or by provider subscription id — never "the contact's
subscription" — so one Contact may own several subscriptions and buying a second
product cannot overwrite the first or duplicate the Contact.

Checkout metadata is treated as untrusted on the way back in. A stamped
`offerKey` is honoured only when the event carries no product id of its own;
whenever Polar names the product, Polar wins.

## Grandfathering guarantees

These are the properties the implementation is built to hold, each covered by
tests:

* An existing $1 subscriber is **never** repriced automatically. No code path
  changes a subscription's price without an explicit, acknowledged user action.
* Ordinary webhook processing cannot migrate them. Webhooks update lifecycle
  state and *strengthen* identity; they never move a subscription to a different
  offer.
* They cannot accidentally become the bundle. Every path that could grant
  OneNews requires either a recognised current bundle product id or an explicit
  transition.
* If they voluntarily upgrade, they must first be shown the warning and pass
  `acknowledgeGrandfatherLoss`. The legacy provider ids are retained in
  `SubscriptionTransition`.
* The old $1 price generally **cannot** be restored afterwards. The legacy
  product is closed to new checkouts, and an in-place change cannot be reversed
  onto it. This is why the warning is mandatory rather than advisory.

## Where the contract lives

One fact, one file. Every other surface reads from these:

| Fact | Owner |
| --- | --- |
| What is sold, its price, cadence, tagline and grants | `lib/products/registry.ts` |
| Which Polar product/env var each offer maps to, and every closed legacy product | `lib/products/polar-config.ts` |
| What a subscription row represents | `lib/products/classification.ts` |
| Whether a contact may access a product | `lib/products/entitlements.ts` |
| How a subscription is described to a human | `lib/billing/presentation.ts` |

Consequences worth stating, because each replaced a second copy:

* The pricing page derives the annual discount with `annualDiscountPercent`
  rather than stating a percentage in copy, and takes each offer's cadence line
  from the registry.
* `lib/launch-config.ts` asks `checkoutEnvVarNames()` and
  `validatePolarConfiguration(env)` for the variables and the legacy-reuse
  check instead of listing them again.
* `lib/oneread/config.ts` defines no price at all. The umbrella is closed, so
  it has nothing for sale to price; the products it grants come from its
  `LEGACY_OFFERS` entry.
* `PRICING` in `lib/options.ts` is read from the registry, for the dev-only
  mock checkout screen.
* OneArticle delivery eligibility (`lib/oneread/access.ts`) resolves the grant
  through `resolveProductEntitlement`, the same resolver OneNews delivery uses.
  It adds only the delivery vocabulary — whether access comes from the reader's
  own subscription or from a plan that includes it.

`lib/products/contract.test.ts` pins this. It scans `app`, `components`, `lib`
and `scripts` and fails if a Polar checkout environment variable name or a
product-id-shaped literal appears outside the registry, so the second copy is
caught at test time rather than in production billing.

## Environment isolation

`POLAR_SERVER` selects the API (`production` only when set to exactly that
string; anything else, including unset, is `sandbox`). Product ids are separate
configuration, so a deployment must set both consistently — the application
cannot detect an id/server mismatch for you, and deliberately does not guess.

Tests never require real Polar credentials. `test/fixtures/polar-offers.ts`
provides deterministic stand-in product ids for the full six-offer matrix.

## No production mutation from this milestone

Milestone C2 added implementation, tests and configuration documentation only.
No Polar products were created, no subscription was migrated or cancelled, and
no production migration was applied.
