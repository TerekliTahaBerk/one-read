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

### Known limitation: unidentified `one-read` rows

`ProductSubscription` records a `productKey` but not the Polar product actually
purchased, and the legacy $1 umbrella shares the `one-read` key with today's $4
bundle. When the provider product id is unknown, the resolver falls back to
**legacy grants (OneArticle only)**.

Under-granting is recoverable through support; over-granting silently gives away
a paid product. Callers that know the provider product id should pass it, and
resolution becomes exact. Persisting the purchased product id on the
subscription row would remove the ambiguity entirely — see Remaining risks.
