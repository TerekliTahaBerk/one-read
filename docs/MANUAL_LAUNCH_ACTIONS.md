# Manual production actions

These actions require provider accounts, DNS control, production credentials, or a real mailbox/payment. Code and local tests cannot truthfully complete them.

Status last checked: **2026-09-07**. A checked item has direct evidence; an unchecked item still needs a provider-dashboard, production event, mailbox, payment, or database check.

## Verified

- [x] Vercel domains: `oneread.email` and `www.oneread.email` are assigned to the `one-read` project; HTTPS serves successfully and the apex returns a permanent `308` redirect to `https://www.oneread.email/`.
- [x] Vercel production configuration contains the required Sentry variable names: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`.
- [x] Vercel production configuration contains `CRON_SECRET`, and `vercel.json`
  intentionally polls `/api/cron/daily` every 10 minutes. The dispatcher treats
  `scheduledFor` as an absolute instant and enforces weekdays in
  `Europe/Istanbul` (UTC+3, no DST).
- [x] Database: all 26 committed migrations are applied in production and
  `prisma migrate status` reports the schema is up to date. The generated
  Prisma client successfully queried `BillingEvent.outcome`,
  `ProductSubscription.billingStateUpdatedAt`, and
  `OneArticleIssue.nativeContent` on 2026-09-06.
- [x] Positioning decision: retain “How to choose a film without endless scrolling” as standalone Journal editorial content. It does not promote a retired product and remains eligible for the blog index and sitemap.
- [x] Resend API/domain authentication: `npm run verify:resend` authenticated
  with the exact Vercel Production API key on 2026-09-06. Resend reported
  `oneread.email` verified with sending enabled and all provider SPF/DKIM
  records verified. This is provider configuration evidence, not mailbox
  delivery evidence.

## Still required

- [ ] Vercel environment values: validate every required production value from `.env.example`, remove obsolete product variables, and confirm preview/production separation. Name presence alone does not prove value correctness.
- [ ] Polar account: confirm production mode, merchant identity/payout readiness, the exact $1/month product, trial disclosure, tax/receipt behavior, and customer portal.
- [ ] Polar redirects: confirm success and return URLs use the production `www` origin and exercise the complete checkout return flow.
- [ ] Polar webhook: register `https://www.oneread.email/api/webhook/polar`, confirm its signing secret in Vercel, and exercise paid, active, past-due, canceled, and revoked events.
- [ ] Resend sender/reply mailbox: replace the unsafe production sender value
  with `FROM_EMAIL="OneRead <hello@oneread.email>"`, add
  `RESEND_REPLY_TO="hello@oneread.email"`, configure inbound mail for the root
  domain, and prove a reply is received and can be answered. The automated
  check on 2026-09-06 found no root-domain MX record.
- [ ] DMARC: publish a deliberate policy at `_dmarc.oneread.email` and validate
  it. The public DNS lookup on 2026-09-06 returned `ENOTFOUND`.
- [ ] Resend webhook: register `https://www.oneread.email/api/webhook/resend` as
  an enabled endpoint for at least `email.bounced` and `email.complained`, then
  copy its `whsec_...` signing secret to Vercel Production as
  `RESEND_WEBHOOK_SECRET` and redeploy. The provider API found no matching
  webhook and Vercel had no secret on 2026-09-06.
- [ ] Deliverability: verify HTML/text rendering, List-Unsubscribe, List-Unsubscribe-Post, one-click behavior, and suppression with Gmail and at least one non-Gmail mailbox.
  Run `npm run verify:resend` with the exact production environment first and
  attach its output. Then follow “Production email acceptance” in
  `docs/LAUNCH_RUNBOOK.md`; mailbox-only checks remain manual gates even when
  the automated verifier passes.
- [ ] Sentry runtime: deploy with source maps and confirm a controlled production event is readable. Configuration names are present, but no event evidence has been recorded.
- [ ] Vercel runtime: complete the controlled exactly-once cron acceptance in
  `docs/LAUNCH_RUNBOOK.md`, inspect Vercel/Sentry for new P2022 or
  `cron_failure`, verify the healthy-only Better Stack heartbeat, and verify
  rollback permissions with the launch operator. Domain, HTTPS, redirect,
  schedule, and secret-name presence are already verified above.
- [ ] Cron monitors: Vercel Production had neither
  `BETTER_STACK_DAILY_CRON_HEARTBEAT_URL` nor
  `BETTER_STACK_NEWS_CRON_HEARTBEAT_URL` when checked on 2026-09-07. Create the
  two monitors, add their secret URLs, redeploy, and capture the success plus
  intentional missed-window notification evidence required by
  `docs/CRON_MONITORING.md`. Do not close this gate from configuration-name
  presence alone.
- [ ] DNS operations: if Cloudflare is introduced, use DNS-only records until proxying has been deliberately tested with Vercel domains, webhooks, and redirects. The domain currently uses third-party nameservers rather than Cloudflare nameservers.
- [ ] Editorial: prepare, test-send, approve, and schedule at least five launch editions; verify source licenses and image rights.
- [ ] Operations: assign an on-call owner, support owner, billing-refund policy owner, incident channel, and 72-hour KPI review cadence.
- [ ] Legal/business: have a qualified reviewer confirm consumer terms, privacy copy, refund/trial disclosures, taxes, business identity, and Türkiye/international obligations.
