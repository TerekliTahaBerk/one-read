# OneRead launch and operations runbook

## Release gate

Do not accept paid traffic until every item is green:

- Production build, lint, unit tests and production dependency audit pass.
- `POLAR_ONEREAD_PRODUCT_ID` points to the $1/month OneRead product.
- The Polar product has the advertised seven-day trial.
- Polar identity/payout setup is complete.
- A real checkout, signed webhook, portal visit and cancellation are verified.
- `hello@oneread.email` receives replies; SPF, DKIM and DMARC pass.
- Sentry receives a controlled test error with readable source maps.
- At least five weekday Article editions and two Saturday Film editions have
  been human-reviewed, test-sent and scheduled.
- Admin Settings shows email, billing, verification, webhook, cron and admin
  authentication as ready.

## Standard release

1. Review `git diff` and commit the exact release.
2. Run:

   ```bash
   npm test
   npm run lint
   npm run build
   npm audit --omit=dev
   npx prisma migrate status
   ```

3. Push the release commit to `main`.
4. Deploy production from that commit.
5. Confirm `/`, `/subscribe`, `/pricing`, `/article`, `/film`, `/terms`,
   `/privacy`, `/robots.txt` and `/sitemap.xml`.
6. Open `/admin/settings` and verify every readiness signal.
7. Perform one controlled subscriber journey before enabling public traffic.

## Editorial checklist

For every edition:

1. Record and open the primary source.
2. Write original copy; do not paste a publisher's text.
3. Verify names, numbers, dates, film metadata and links.
4. Add meaningful image alternative text and credit when an image is used.
5. Preview HTML and text renderings.
6. Send a test to the editor.
7. Human-review the received email.
8. Mark ready and schedule for 07:00 Europe/Istanbul.

Cron never creates content. A missing edition during the expected window sends
one deduplicated alert to the admin address.

## Incident response

### Payment failure

- Disable public acquisition or change the CTA to a maintenance state.
- Keep email preference records; do not grant access manually unless recorded.
- Inspect Polar checkout, webhook delivery and `BillingEvent` processing.
- Retry idempotently after the cause is fixed.

### Delivery failure

- Enable dry-run in Admin Settings if a bad edition may still be due.
- Inspect the operational run and recipient delivery errors.
- Correct the edition/provider problem.
- Retry through the admin action; idempotency prevents duplicate successful
  deliveries.

### Cron returned 500 / database outage

Both editorial crons run every ten minutes and share one failure contract
(`lib/admin/editorial-cron.ts`). A failed invocation answers 500 with a
machine-readable body:

```
{ "ok": false, "code": "P1001", "stage": "start", "retryable": true,
  "runId": null, "runRecorded": false }
```

- `stage: "start"` — the run row was never created. **The admin panel will show
  nothing for this invocation.** Look in Vercel runtime logs and Sentry for the
  structured event `cron_failure`, plus the admin email (it says explicitly that
  no run row exists). The companion event `settings_read_degraded` means the
  panel controls fell back to environment defaults for the same reason.
- `stage: "dispatch"` — the run row exists; open Admin → Run history for the
  error, and check per-recipient delivery rows.
- `retryable: true` — a transient Prisma/connection fault (`P1001`, `P1002`,
  `P1008`, `P1017`, `P2024`, `P2034`). `retryable: false` needs a fix first.

Response:

1. Confirm the database is actually down (provider status, `db.prisma.io:5432`).
   `P1001` on `/api/cron/one-film` and `/api/cron/daily` at once means
   infrastructure, not editorial.
2. **Do not re-run the cron by hand while the database is unreachable.** Opening
   the run is retried three times in-process with backoff; beyond that, the next
   ten-minute tick is the retry.
3. Once the database is back, wait one tick and confirm a `SUCCESS` run appears.
   No manual replay is needed and none should be issued: a re-run cannot
   double-send. Editions are claimed with a `SCHEDULED → SENDING` compare-and-set,
   each recipient has a unique delivery row, and every send carries a stable
   provider idempotency key.
4. Runs the outage left stuck in `RUNNING` are closed automatically by the next
   invocation, 15 minutes after they started, as
   `abandoned_run: no outcome recorded`. Editions stuck in `SENDING` are released
   back to `SCHEDULED` on the same window and re-sent safely. If a run still
   shows `RUNNING` after two healthy ticks, the cron is not firing at all —
   check the Vercel cron schedule and `CRON_SECRET`.
5. If the outage spanned a publishing window (Article Mon–Fri, Film Sat), verify
   the edition actually went out before rescheduling anything by hand.

### Compromised admin credential

- Rotate the affected password hash and `ADMIN_SESSION_SECRET`.
- Review `AdminAuditLog`.
- Rotate `ADMIN_TOKEN` if API-token access may be affected.
- Do not clear suppression or billing records as part of credential rotation.

### Rollback

- Redeploy the last known-good Git commit.
- Do not roll back an applied database migration destructively.
- Keep forward-compatible migrations and ship a corrective migration instead.

## Weekly checks

- Review failed/skipped deliveries and operational alerts.
- Confirm the next seven days of Article and next two Film editions.
- Check Polar disputes, failed payments and payout readiness.
- Check Resend bounce/complaint rates.
- Review Sentry regressions and dependency advisories.
- Export a subscriber backup from the admin panel and store it securely.
