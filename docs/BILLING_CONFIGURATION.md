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

The legacy `$1` flow (`POST /api/oneread/checkout`) is a separate, unchanged
code path that still serves the live signup page. Pointing it at the new
registry would reprice new signups the moment the six product ids were
configured, so it is left alone until the C5 multi-product signup UX replaces
it.

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
| `ignored_event_type` | Not a billing lifecycle event. |

Duplicate deliveries are absorbed at the route by the unique
`BillingEvent.providerEventId`; an event inserted but never processed is retried
rather than acknowledged and lost. Subscriptions are located per
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
