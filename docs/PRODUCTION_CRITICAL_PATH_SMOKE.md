# Production critical-path smoke runbook

This is the final launch gate. The automated layers beneath it are one command —
`npm run gate:money-flow`, described in `docs/MONEY_FLOW_REGRESSION_GATE.md` —
and this runbook is the layer that command cannot perform. Automated tests prove the deterministic boundaries; they do not replace a real Polar payment, signed webhook, Resend acceptance, or mailbox delivery.

## Flow and state transitions

`/pricing` → `/subscribe?offer=…` → verification request → verification confirm (identity only) → language/preferences (`PENDING_CHECKOUT`) → semantic checkout → Polar hosted payment → signed webhook (`ACTIVE_PAID`, provider identity, monotonic `billingStateUpdatedAt`) → centralized entitlement → scheduled editorial issue → authorized cron → one delivery row (`SENT`/`ACCEPTED`, then provider delivery state) → mailbox.

The launch registry is `lib/products/registry.ts`: `one-article`, `one-news`, and `one-read`; the bundle grants both products. Legacy offers are inbound-only and must never be used for checkout.

## Before running

1. Record deployment SHA, UTC timestamp, Vercel deployment URL, and production origin.
2. Confirm Y-153, Y-154, and Y-155 are complete. Check post-deploy Vercel/Sentry baseline for P2022, Resend configuration errors, cron failures, and unprocessed billing events.
3. Prepare three unique controlled mailboxes and controlled Polar payment identities. Agree the exact charge and refund/cancel procedure before payment. Never use customer data or broadcast sends.

## Per-offer happy path

Run OneArticle, OneNews, then OneRead bundle through the public UI. Confirm the verification code once; replay must fail. Confirm checkout is hosted by Polar and returns to `https://www.oneread.email`. Abandon one additional checkout and verify it remains `PENDING_CHECKOUT` without entitlement.

After payment, run the read-only invariant check with production credentials available only in the operator shell:

```bash
SMOKE_TEST_EMAIL='<controlled>' SMOKE_EXPECTED_OFFER='one-article' npm run smoke:critical-path
```

Repeat for `one-news` and `one-read`. The command prints only a short email hash and non-secret state; attach its output to Y-156. Redeliver the same signed Polar event from the provider dashboard and confirm one `BillingEvent.providerEventId`, no second transition, and unchanged/newer `billingStateUpdatedAt`. Deliver an older event and confirm `ignored_stale`. An unknown product must record/return `unrecognized_product`, never bundle access.

## Delivery, consent, and billing management

Create a clearly labeled controlled editorial issue, schedule it due, invoke the matching authorized cron, then invoke it again. Confirm exactly one delivery row, one provider message id, and one mailbox message. Record provider acceptance and delivered/bounced state separately. Unsubscribe the controlled identity and confirm email eligibility stops while paid access remains. Open the Polar portal, verify the return URL, and cancel at period end; confirm access remains only through the paid period.

## Required evidence and pass rule

Run `npm ci`, `npx prisma validate`, `npm run verify:launch`, `npm run lint`, `npm run build`, and `npm run gate:money-flow` (which runs `npm test`, `npm run test:integration` and `npm run test:e2e` as one contract). Capture command result counts, deployment-filtered Sentry/Vercel logs, Polar event IDs (redacted), Resend message status, and mailbox screenshots. Re-check logs after the test timestamp.

PASS requires all three offers, no manual DB edits, no new P2022/config/critical runtime error, idempotent webhook and cron behavior, matching payment/entitlement state, and exactly one expected email. Without provider and mailbox evidence, report the gate as blocked—not passed.
