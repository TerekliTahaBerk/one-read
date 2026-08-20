# OneArticle production launch runbook

## A. Release gate

The launch verdict is **ready after manual actions** until every checkbox in `MANUAL_LAUNCH_ACTIONS.md` has evidence attached.

- CI is green: lint, unit tests, production build, route manifest, migration replay, and production dependency audit.
- Production has a single Polar product ID for the advertised $1/month plan and the advertised trial, if enabled.
- Polar and Resend webhook endpoints are configured with production signing secrets.
- SPF, DKIM, DMARC, reply delivery, bounce handling, complaint handling, and one-click unsubscribe are verified using real mailboxes.
- Sentry receives a controlled production test event with readable source maps.
- At least five weekday OneArticle editions are reviewed, test-sent, approved, and scheduled.
- Admin authentication, mutation controls, cron controls, and the production domain are verified.

## B. Standard release

1. Review the diff and confirm no real secret, `.env`, subscriber export, or generated email is tracked.
2. Run the quality commands from the README.
3. Open a pull request and merge to `main`. The Vercel Git integration creates the production artifact.
4. Apply the checked-in Prisma migrations with the production migration workflow.
5. Run `npm run release:verify` and confirm the domain points to the intended `main` commit.
6. Complete the smoke tests below before enabling acquisition.

The emergency CLI deploy is only for a Git-integration outage or an intentional rollback:

```bash
npm run deploy:emergency -- --reason "incident reference and reason"
```

Run once without `--yes` to inspect the plan. A normal release must not use this path.

## C. Launch smoke tests

Use a fresh address and a real production payment method where Polar permits it. Record timestamps and provider IDs without copying secrets into the ticket.

1. Load `/`, `/article`, `/pricing`, `/subscribe`, `/preferences`, `/samples/article`, `/editorial`, `/terms`, `/privacy`, `/robots.txt`, and `/sitemap.xml`.
2. Confirm `/film`, `/lingo`, `/waitlist`, retired APIs, and retired admin URLs return 404.
3. Request a verification code. Confirm the response does not expose it, resend is rate-limited, wrong codes consume attempts, and expiry is enforced.
4. Save OneArticle preferences, review the $1/month offer, and enter Polar checkout.
5. Complete checkout. Confirm exactly one signed `BillingEvent`, an active OneRead subscription, and a working verified portal link.
6. Replay the Polar event. Confirm it is acknowledged as a duplicate and does not change state. Deliver an older lifecycle event and confirm it cannot overwrite newer billing state.
7. Send a reviewed test edition, then a controlled production edition. Confirm HTML, text, links, source attribution, reply-to, and both List-Unsubscribe headers.
8. Use one-click unsubscribe. Confirm the OneArticle row changes immediately and the paid plan remains unchanged.
9. Send signed Resend bounce and complaint fixtures. Confirm matching OneRead/OneArticle delivery state becomes `SUPPRESSED`.
10. Cancel renewal in the Polar portal and confirm webhook-driven access matches the promised end-of-period behavior.
11. Confirm the cron rejects an invalid secret, accepts the Vercel cron request, sends no unapproved edition, and does not duplicate a successful recipient delivery.
12. Confirm Sentry, operational alert email, Vercel logs, and admin run history contain enough identifiers to investigate without exposing verification codes or secrets.

## D. Editorial operations

For each edition: record the source, write original copy, verify material claims and links, add meaningful image credit/alt text if used, preview HTML and text, send a test, review the received email, approve, and schedule it for the configured weekday window.

Cron never creates or approves content. It only claims an eligible scheduled OneArticle edition and writes idempotent recipient deliveries. A missing edition, failed run, or zero-delivery outcome must create an operational alert.

## E. Incident response and rollback

### Payments

Pause acquisition. Inspect Polar delivery attempts and the stored `BillingEvent`. Never grant paid access from an unsigned request. An unprocessed event row is retryable; a processed duplicate is a no-op. Do not delete event records during recovery.

### Email delivery

Enable OneArticle dry-run if an unsafe edition remains due. Inspect the operational run and recipient rows, fix the edition or provider problem, then retry through the authorized admin action. Never clear `SUPPRESSED` automatically; only a deliberate support resolution may do that.

### Database or cron outage

Check Vercel runtime logs, Sentry, provider status, admin run history, and the `cron_failure` event. Wait for the next scheduled retry after recovery before manually replaying. Recipient uniqueness and stable provider idempotency keys prevent duplicate successful deliveries.

### Credential compromise

Rotate the affected secret, invalidate `ADMIN_SESSION_SECRET` when admin access is involved, inspect `AdminAuditLog`, and rotate webhook secrets at both provider and Vercel. Do not modify billing or suppression records as part of credential rotation.

### Rollback

Promote the last known-good Vercel artifact. Do not destructively reverse an applied migration; ship a forward-compatible corrective migration. After rollback, rerun route, checkout, webhook, unsubscribe, and cron smoke tests.

## F. Daily and weekly launch monitoring

For the first 72 hours, check signup verification failures, checkout conversion, webhook failures/unprocessed events, active-vs-subscribed counts, bounce/complaint/unsubscribe rates, cron success, recipient failures, Sentry errors, and support replies at least twice daily.

Weekly: review failed/skipped deliveries, upcoming approved editions, Polar disputes and payouts, Resend reputation, Sentry regressions, dependency advisories, admin audit entries, and a securely stored subscriber export.

Initial KPI definitions:

- Verification completion: confirmed codes / accepted code requests.
- Preference completion: complete OneArticle preferences / verified contacts.
- Checkout completion: first active paid event / checkout sessions.
- Delivery success: successful recipient deliveries / attempted eligible deliveries.
- Complaint and bounce rates: provider events / delivered emails.
- 7-day retention proxy: still subscribed and billable seven days after activation / activations.
