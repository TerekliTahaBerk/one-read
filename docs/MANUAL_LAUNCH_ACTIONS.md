# Manual production actions

These actions require provider accounts, DNS control, production credentials, or a real mailbox/payment. Code and local tests cannot truthfully complete them.

- [ ] Vercel: set every required production variable from `.env.example`; confirm preview and production values are separated.
- [ ] Database: back up production, apply migrations, and confirm `npx prisma migrate status` reports no pending migration.
- [ ] Polar: confirm production mode, merchant identity/payout readiness, exact $1/month product, trial disclosure, tax/receipt behavior, success/return URLs, and customer portal.
- [ ] Polar: register `https://oneread.email/api/webhook/polar`, copy its signing secret to Vercel, and exercise paid, active, past-due, canceled, and revoked events.
- [ ] Resend/DNS: verify the sending domain; publish and validate SPF, DKIM, and DMARC; confirm `hello@oneread.email` receives replies.
- [ ] Resend: register `https://oneread.email/api/webhook/resend` for bounce and complaint events and copy its signing secret to Vercel.
- [ ] Deliverability: verify HTML/text rendering, List-Unsubscribe, List-Unsubscribe-Post, one-click behavior, and suppression with Gmail and at least one non-Gmail mailbox.
- [ ] Sentry: configure project/org/auth values, upload source maps, and confirm a controlled production event.
- [ ] Vercel: verify the custom domain, HTTPS redirect, certificate, cron schedule, cron authentication, runtime logs, and rollback permissions.
- [ ] Cloudflare: no reverse proxy is required. If DNS is hosted there, use DNS-only records during initial verification unless proxying has been deliberately tested with Vercel domains, webhooks, and redirects.
- [ ] Editorial: prepare, test-send, approve, and schedule at least five launch editions; verify source licenses and image rights.
- [ ] Operations: assign an on-call owner, support owner, billing-refund policy owner, incident channel, and 72-hour KPI review cadence.
- [ ] Legal/business: have a qualified reviewer confirm consumer terms, privacy copy, refund/trial disclosures, taxes, business identity, and Türkiye/international obligations.

