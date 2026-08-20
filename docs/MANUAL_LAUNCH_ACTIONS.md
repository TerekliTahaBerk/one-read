# Manual production actions

These actions require provider accounts, DNS control, production credentials, or a real mailbox/payment. Code and local tests cannot truthfully complete them.

Status last checked: **2026-08-20**. A checked item has direct evidence; an unchecked item still needs a provider-dashboard, production event, mailbox, payment, or database check.

## Verified

- [x] Vercel domains: `oneread.email` and `www.oneread.email` are assigned to the `one-read` project; HTTPS serves successfully and the apex returns a permanent `308` redirect to `https://www.oneread.email/`.
- [x] Vercel production configuration contains the required Sentry variable names: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`.
- [x] Vercel production configuration contains `CRON_SECRET`, and `vercel.json` declares `/api/cron/daily` on the intended schedule.
- [x] Positioning decision: retain “How to choose a film without endless scrolling” as standalone Journal editorial content. It does not promote a retired product and remains eligible for the blog index and sitemap.

## Still required

- [ ] Vercel environment values: validate every required production value from `.env.example`, remove obsolete product variables, and confirm preview/production separation. Name presence alone does not prove value correctness.
- [ ] Database: back up production, apply migrations, and confirm `npx prisma migrate status` reports no pending migration. This remains tracked separately from the application fixes.
- [ ] Polar account: confirm production mode, merchant identity/payout readiness, the exact $1/month product, trial disclosure, tax/receipt behavior, and customer portal.
- [ ] Polar redirects: confirm success and return URLs use the production `www` origin and exercise the complete checkout return flow.
- [ ] Polar webhook: register `https://www.oneread.email/api/webhook/polar`, confirm its signing secret in Vercel, and exercise paid, active, past-due, canceled, and revoked events.
- [ ] Resend/DNS: verify the sending domain; publish and validate SPF, DKIM, and DMARC; confirm `hello@oneread.email` receives replies.
- [ ] Resend webhook: register `https://www.oneread.email/api/webhook/resend` for bounce and complaint events, then add `RESEND_WEBHOOK_SECRET` to Vercel production. The variable was missing from the production environment listing on 2026-08-20.
- [ ] Deliverability: verify HTML/text rendering, List-Unsubscribe, List-Unsubscribe-Post, one-click behavior, and suppression with Gmail and at least one non-Gmail mailbox.
- [ ] Sentry runtime: deploy with source maps and confirm a controlled production event is readable. Configuration names are present, but no event evidence has been recorded.
- [ ] Vercel runtime: exercise cron authentication, inspect runtime logs, and verify rollback permissions with the launch operator. Domain, HTTPS, redirect, schedule, and secret-name presence are already verified above.
- [ ] DNS operations: if Cloudflare is introduced, use DNS-only records until proxying has been deliberately tested with Vercel domains, webhooks, and redirects. The domain currently uses third-party nameservers rather than Cloudflare nameservers.
- [ ] Editorial: prepare, test-send, approve, and schedule at least five launch editions; verify source licenses and image rights.
- [ ] Operations: assign an on-call owner, support owner, billing-refund policy owner, incident channel, and 72-hour KPI review cadence.
- [ ] Legal/business: have a qualified reviewer confirm consumer terms, privacy copy, refund/trial disclosures, taxes, business identity, and Türkiye/international obligations.
