# Terminology contract

The canonical names for OneRead's brand, products, offers, and plans.

**Source of truth:** [`lib/products/terminology.ts`](../lib/products/terminology.ts),
enforced by [`lib/products/terminology.test.ts`](../lib/products/terminology.test.ts).

This document explains the model and records the inventory that produced it. It
does not restate the names — the module does, and a second copy here would be
the exact drift the contract exists to stop.

## The model

| Kind | Name | What it is |
| --- | --- | --- |
| Brand | **OneRead** | The umbrella. Not an editorial product; nobody receives "a OneRead". |
| Product | **OneArticle** | Weekday article brief. |
| Product | **OneNews** | Mon / Wed / Fri news brief. |
| Offer | **OneArticle** | Standalone purchase granting the OneArticle product. |
| Offer | **OneNews** | Standalone purchase granting the OneNews product. |
| Offer | **OneRead** | The bundle. Grants both products. |

`OneRead` deliberately names two things — the brand and the bundle offer.
`identitiesFor("one-read")` returns both readings; a caller that has not decided
which one it means has a copy bug, not a lookup failure.

"Plan" is not a fourth concept. On a subscriber-facing surface a plan is an
**(offer, billing interval)** pair, and both halves come from the registry.

## Where each fact lives

| Fact | Owner |
| --- | --- |
| Which products exist, which offers grant them, prices, cadence | [`lib/products/registry.ts`](../lib/products/registry.ts) |
| What those things are called; retired vocabulary; the alias inventory | [`lib/products/terminology.ts`](../lib/products/terminology.ts) |
| Which Polar product id an (offer, interval) is sold at | [`lib/products/polar-config.ts`](../lib/products/polar-config.ts) |
| Which offer created an existing subscription row | [`lib/products/classification.ts`](../lib/products/classification.ts) |
| What a live subscription grants today | [`lib/products/entitlements.ts`](../lib/products/entitlements.ts) |

Nothing else may define any of these. `contract.test.ts` enforces the registry
half; `terminology.test.ts` enforces the naming half.

## Retired vocabulary

`RETIRED_TERMINOLOGY` lists what must not appear on a public commercial surface,
and `PUBLIC_COMMERCIAL_SURFACES` lists the files scanned for it. In short:

- **OneFilm, OneLingo, OneGoal** — retired or never launched. Their Prisma
  models and blocked routes survive to preserve historical rows; their names do
  not survive in copy.
- **"All Access", "$3 All Access"** — planning-era names for the bundle. The
  bundle is called OneRead and its price comes from the registry.
- **"One subscription. One dollar.", "$1/month"** — the closed umbrella plan.
- **"the OneRead family"** (and `famille OneRead` / `OneRead-Familie` /
  `OneRead ailesi`) — planning-era vocabulary for a line-up that was never
  built. Say OneRead, or name the two products.

The closed $1 plan is still *nameable* in the billing, entitlement, and admin
layers, and in a grandfathering disclosure to the subscribers who are on it. The
guard matches sales *claims* ("OneRead is $1", "$1/month"), not the digit, so
"your grandfathered $1 plan" stays legal on the surfaces that must say it.

## Inventory: the drift this contract consolidated

Recorded so a reviewer can tell a deliberate name from a returning habit. The
machine-readable form is `ALIASES` in the module.

| Concept | Names it had | Now |
| --- | --- | --- |
| What the bundle includes | `"OneArticle + OneNews"` hardcoded in the signup flow; `OFFERS["one-read"].grants` in the registry | `offerIncludesLabel()`, derived from `grants` |
| An offer's cadence line | a `CADENCE` map in the signup flow; `OFFERS[key].cadence` in the registry | `OFFERS[key].cadence`; the bundle names its products instead |
| What a subscription covers | "OneArticle and OneFilm" (site copy, 4 locales); "includes OneArticle" (terms, 4 locales); "OneArticle and OneNews" (pricing metadata) | OneArticle and OneNews, everywhere |
| The product line | "the OneRead family" (site copy, 4 locales) | OneRead, or the two product names |
| The launch offer | "$1/month" (README); "One subscription. One dollar." (site copy, 4 locales) | the registry's prices |
| The closed umbrella | `legacy-one-read-umbrella`, "the umbrella", "the grandfathered $1 plan" | unchanged — billing-layer names for a closed plan, never the current bundle |

## Adding a product or an offer

1. Add it to `lib/products/registry.ts` — key, display name, tagline, cadence,
   grants, prices.
2. Map its Polar products in `lib/products/polar-config.ts`.
3. Nothing else. Terminology, the pricing page, the signup flow, and the
   checkout copy derive from those two files. If a surface needs a name it
   cannot derive, that surface has found a gap in this contract — widen the
   contract rather than hardcode the name.
