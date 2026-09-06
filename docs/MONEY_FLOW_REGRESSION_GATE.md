# The money-flow regression gate

Phase 1 built the billing contracts one task at a time, and each task left its
own tests behind. That proves the contracts today; it does not keep them proven.
A case can quietly lose its only covering test in a refactor and nothing fails.

This is the single gate that stops that. One command runs every automated layer
of the money flow, and one file — `test/money-flow-matrix.test.ts` — records
which test owns which case, so removing coverage is a deliberate, reviewable
edit rather than a silent one.

```bash
PRISMA_DATABASE_URL=postgresql://$(whoami)@localhost:5432/oneread_gate npm run gate:money-flow
```

Add `-- --skip-e2e` to skip the browser layer (and the production build it
needs) while iterating. That is not the full gate and the command says so.

## The layers

| Layer | Proves | Where |
| --- | --- | --- |
| Unit | Offer mapping and the pure billing/entitlement policies | `lib/products/*.test.ts`, `lib/billing/*.test.ts`, `lib/verification/core.test.ts` |
| Matrix | Every mandatory case still has an owning test | `test/money-flow-matrix.test.ts` |
| Integration | Verification/checkout boundary, a genuinely signed webhook, and DB transitions against real Postgres | `test/integration/money-flow.test.ts` |
| E2E | Product selection → email → verification → checkout boundary in a browser | `e2e/critical-flows.spec.ts` |
| Controlled provider smoke | A real payment and a real signed lifecycle event reaching local state | Manual. `npm run smoke:critical-path` |

CI runs the unit, matrix and integration layers on every push — the integration
job already has its own throwaway Postgres. It does not run Playwright, so the
e2e layer is proven by running this command locally before the gate is claimed.

The fifth layer is not automated and is not pretended to be: the gate ends by
saying it is still owed. A green run of the first four layers has never touched
a payment provider.

## What the integration layer does and does not fake

Only two things are faked, both outbound network calls a test must not make:
creating a Polar checkout, and Resend delivery. (Verification treats a failed
send as a supported path and hands the code back as `devCode`, which is how the
test reads the code a subscriber would read in their inbox.)

Everything else is real. In particular the properties the revenue rests on are
exercised, not simulated:

- **Signature verification.** `test/fixtures/polar-webhook-delivery.ts` builds a
  payload complete enough to survive the Polar SDK's own inbound schema and
  signs it with the shared secret exactly as Polar does. A forged delivery is
  signed with a different secret rather than by corrupting a header, so what is
  under test is verification and not header parsing. If a payload built there
  starts failing the SDK's schema, that is a real signal: the provider changed
  the envelope we claim to understand.
- **Idempotency**, enforced by the `providerEventId` unique constraint in
  Postgres, not by a read-then-write check.
- **The monotonic billing clock**, enforced by a conditional write, so a stale
  or reordered delivery cannot regress access.
- **Entitlement**, resolved from the rows the webhook actually wrote.

## Database safety

The integration layer writes rows. `.env` in this repo holds the **production**
`PRISMA_DATABASE_URL`, so the gate refuses to run unless it is told where to
write, refuses a URL equal to the one in `.env`, and refuses a non-local host
unless `MONEY_FLOW_GATE_ALLOW_REMOTE_DB=true` says that host is a throwaway.

Create a throwaway database once:

```bash
createdb oneread_gate
```

Then apply migrations against a schema copy whose datasource is hardcoded to it
— hardcoding beats injecting an environment variable, because no `.env` value
can then win:

```bash
cp -R prisma /tmp/gate-prisma && sed -i '' 's|env("PRISMA_DATABASE_URL")|"postgresql://'"$(whoami)"'@localhost:5432/oneread_gate"|' /tmp/gate-prisma/schema.prisma && npx prisma migrate deploy --schema /tmp/gate-prisma/schema.prisma
```

Confirm the target in Prisma's own "Datasource" output line before trusting the
run. The integration tests clean up every row they create, keyed by a per-run
prefix.

## The mandatory matrix

Owned by `test/money-flow-matrix.test.ts`, which reads the named files and fails
if a claimed test no longer exists.

- Happy purchase path for each launch offer: OneArticle, OneNews, the OneRead bundle
- Invalid, expired and replayed verification
- Checkout abandonment
- Unknown offer
- Invalid webhook signature
- Duplicate webhook
- Stale / out-of-order webhook
- Unknown provider product
- Missing correlation
- active → cancel-at-period-end → expired
- past_due → recovered active
- Cancellation / revocation / refund contract
- Resubscribe / reactivation

Adding a case: add the entry, then write the test. Removing coverage means
removing the entry, which is what makes it visible in review.

## The controlled provider smoke

The runbook is `docs/PRODUCTION_CRITICAL_PATH_SMOKE.md`. What
`npm run smoke:critical-path` adds beyond "the row looks paid" is the link back
to the provider: it correlates the stored `BillingEvent` rows to the
subscription and refuses a row that reads `ACTIVE_PAID` with no applied provider
event behind it — the exact shape of a manual edit, or a repair that was never
re-confirmed by the provider.

```bash
SMOKE_TEST_EMAIL='<controlled>' SMOKE_EXPECTED_OFFER='one-article' npm run smoke:critical-path
```

It is read-only and prints a short email hash and non-secret state only. Without
provider and mailbox evidence, report the gate as blocked — not passed.

## When the gate fails

A failure here is usually a regression in the task that owns the contract, not
in the gate. Fix it where the contract lives — `lib/products/registry.ts`,
`lib/products/polar-config.ts`, `lib/billing/polar.ts`, `lib/billing/lifecycle.ts`,
`lib/billing/transitions.ts` — and leave the gate describing the contract rather
than accommodating the break.
