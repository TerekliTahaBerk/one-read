# OneRead

OneRead is the subscription and account layer for **OneArticle**: one human-reviewed article briefing delivered every weekday. The launch offer is **$1/month** through Polar.

OneArticle is the only production product. Older Film and Lingo database models remain solely to preserve historical data; they have no public pages, checkout APIs, cron jobs, admin operations, or production dispatch path.

## Stack

- Next.js 15, React 18, TypeScript
- PostgreSQL and Prisma
- Polar checkout, subscriptions, signed webhooks, and customer portal
- Resend verification, editorial email, alerts, and signed suppression webhooks
- Sentry monitoring; Vercel hosting and cron

## Local setup

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

## Reader flow

1. `/subscribe` verifies inbox ownership with an expiring six-digit code.
2. The reader saves OneArticle interests and languages.
3. `/api/oneread/checkout` creates the Polar checkout for the configured OneRead product.
4. `/api/webhook/polar` verifies, records, and idempotently applies billing events.
5. An editor prepares and explicitly schedules an edition.
6. `/api/cron/daily` sends only eligible, subscribed readers and records recipient-level delivery state.

Email consent and paid renewal are separate. Every editorial email includes visible unsubscribe copy and RFC 8058 one-click headers. Resend bounce/complaint events immediately suppress future OneArticle delivery.

## Production route boundary

The production routes are documented in [`docs/PRODUCTION_ROUTE_INVENTORY.md`](docs/PRODUCTION_ROUTE_INVENTORY.md). `lib/security/route-policy.mjs` denies all retired product routes and legacy subscription APIs. `npm run verify:routes` inspects the actual Next.js build manifest.

Mock billing files use `route.mock.ts` and `page.mock.tsx`. They are omitted from production compilation, rejected by the route manifest guard, and fail closed in their write helpers. `VERCEL_ENV=production` cannot be overridden by `MOCK_BILLING_PREVIEW`.

## Quality gates

```bash
npm run lint
npm test
npm run build
npm run verify:routes
npm run audit:prod
npx prisma validate
```

CI also replays migrations on an empty PostgreSQL database. The launch migration is additive: it adds webhook ordering metadata and does not delete legacy data.

## Release and operations

Merging a reviewed commit to `main` is the standard production release through the Vercel Git integration. Do not create a second routine artifact with `vercel --prod`.

Use [`docs/LAUNCH_RUNBOOK.md`](docs/LAUNCH_RUNBOOK.md) for release, smoke-test, rollback, and incident procedures. Human-only production actions are isolated in [`docs/MANUAL_LAUNCH_ACTIONS.md`](docs/MANUAL_LAUNCH_ACTIONS.md).
