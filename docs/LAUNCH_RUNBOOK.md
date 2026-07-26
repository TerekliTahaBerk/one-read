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
