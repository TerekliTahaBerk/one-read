# OneRead public launch runbook

## Before launch

- Confirm CI, unit, integration, Playwright, migration replay, and drift checks are green.
- Review additive migrations; never roll back by deleting subscriber or billing data.
- Keep `PRISMA_DATABASE_URL` configured for both Vercel Production and the GitHub
  Production release workflow. The Vercel build applies migrations and prints
  `prisma migrate status` before compiling the new artifact; either missing
  access or a failed migration blocks the release.
- Configure six unique Polar product IDs: Article, News, and Bundle, monthly and annual.
- Set `POLAR_SERVER=production`, then run `npm run verify:launch` in the protected production environment.
- Verify Polar and Resend webhook secrets, sender configuration, Sentry, and the Better Stack heartbeat.
- In an environment loaded with the exact Vercel Production values, run
  `npm run verify:resend`. Save its timestamped output as launch evidence. This
  proves API-key validity, Resend domain/SPF/DKIM status, DMARC publication, and
  the enabled bounce/complaint webhook registration; it does not prove inbox
  placement or reply reception.
- Keep `PUBLIC_CHECKOUT_ENABLED=false` and `ONENEWS_DELIVERY_ENABLED=false` while validating the deployment.

## Sandbox verification

With Polar sandbox configuration, test Article, News, and Bundle in both intervals. Verify dual standalones, Article/News → Bundle, Bundle downgrades, interval changes, and the mandatory grandfather warning. Do not infer proration locally; inspect Polar's result.

## Public deployment

Deploy pricing, signup, samples, My OneRead, and unsubscribe surfaces first. Smoke-test without production checkout. When configuration and monitored sandbox evidence are complete, set `PUBLIC_CHECKOUT_ENABLED=true`. The retired legacy endpoint remains closed.

## Production email acceptance

Keep live delivery disabled until all of the following evidence is attached to
the launch record:

1. `npm run verify:resend` passes against the exact production secrets.
2. Request a verification code in production to a Gmail mailbox and a mailbox
   on a different provider. Record receipt, headers showing SPF/DKIM/DMARC pass,
   and readable HTML and plain-text parts. Never record the verification code.
3. Send an editorial test to both mailboxes. Record the visible unsubscribe
   link, `List-Unsubscribe`, `List-Unsubscribe-Post`, and a successful one-click
   unsubscribe request.
4. Reply to a test message and confirm the reply reaches
   `hello@oneread.email` and can be answered.
5. Use a controlled bounce address or Resend test event, then confirm the
   signed production webhook updates provider status and marks that recipient
   `SUPPRESSED`. Do not use an actual subscriber for this test.

An API response with a message id proves only provider acceptance. Inbox
receipt proves delivery for that mailbox. Neither is evidence for the other.

## Production cron acceptance

Keep OneArticle automatic dispatch paused while preparing this check. Use a
clearly labelled operator-owned test contact, an active test subscription, and
a dedicated test issue; never widen eligibility to real subscribers.

1. Schedule the test issue due on a weekday in `Europe/Istanbul`, then enable
   automatic dispatch for the controlled window.
2. Call `GET /api/cron/daily` with Vercel's `Authorization: Bearer` header.
   Confirm an invalid token returns 401 and creates no `OperationalRun`.
3. Confirm one accepted delivery row, one provider message ID, one mailbox
   message, and a successful run whose eligible/attempted/sent counts agree.
4. Invoke the authorized route again. Confirm no second provider message or
   mailbox message and no second delivery row for the same issue/contact.
5. Inspect Vercel and Sentry for P2022 or `cron_failure`, and confirm the Better
   Stack heartbeat timestamp advanced only for the healthy run.
6. Pause automatic dispatch again if launch editions are not ready. Cancel the
   dedicated issue and suppress/archive the test subscription using normal
   operator controls; do not delete historical delivery or run rows.

## OneNews beta activation

Public checkout does not enable delivery. Review an approved issue, exact test rendering, recipient count, sources, schedule, and operator dashboard. Then explicitly set `ONENEWS_DELIVERY_ENABLED=true`. Monitor the first OperationalRun, accepted/delivered distinction, failures, suppressions, Sentry, and heartbeat.

## Rollback

Set `PUBLIC_CHECKOUT_ENABLED=false` to stop new purchases and `ONENEWS_DELIVERY_ENABLED=false` to stop News cron delivery. Leave OneArticle and all Polar subscriptions untouched. Roll back code only to a schema-compatible release; do not reverse migrations destructively or delete delivery/idempotency rows.
