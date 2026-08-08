# OneRead

OneRead is a paid email subscription that combines:

- **OneArticle** — one human-reviewed article briefing every weekday.
- **OneFilm** — one human-reviewed film note every Saturday.

One subscription includes both products for **$1 per month**, with preferences
for reading language, interests, genres, moods, decades, film languages and
spoiler level.

## Stack

- Next.js 15, React 18 and TypeScript
- PostgreSQL and Prisma
- Polar for checkout, subscriptions and the customer portal
- Resend for verification, editorial delivery and operational alerts
- Sentry for production error monitoring
- Vercel for hosting and ten-minute editorial dispatch crons

## Local setup

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm test
npm run build
npm run verify:routes
npm run audit:prod
```

These are release gates, and they are enforced — `.github/workflows/ci.yml`
runs every one of them on each pull request. They are not a checklist you are
trusted to remember locally.

| Job name (branch protection) | What it runs | Fails when |
| --- | --- | --- |
| `Lint` | `npm run lint` | any ESLint error or warning |
| `Unit tests` | `npm run test:coverage` | any failing test; uploads `coverage-report` |
| `Production build` | `npm run build`, then `npm run verify:routes` | the build breaks, or a dev/test-only route reached the artifact |
| `Prisma migrations` | replays the migration history on a throwaway Postgres | a migration fails to apply, or `schema.prisma` has no matching migration |
| `Production dependency audit` | `npm run audit:prod` | a high or critical advisory in the **production** tree |

Those job names are the interface for GitHub branch protection's required
checks. Renaming a job silently un-requires it.

The coverage report is downloadable from the `coverage-report` artifact on any
CI run. Dev-only advisories are reported but never block: they are not part of
the shipped artifact.

## Production route surface

Some routes exist only to make local and preview development workable, and
shipping them would be a security problem rather than a cosmetic one. The mock
billing endpoints are the clearest case — `/api/subscribe/mock/complete` sets a
subscription to `ACTIVE_PAID` with no payment at all.

They are kept out of production by construction, in three layers:

1. **Not compiled.** Their files are named `route.mock.ts` / `page.mock.tsx`.
   Next.js only treats a file as a route when it matches `pageExtensions`, and
   `next.config.mjs` omits the `mock.*` extensions for production builds. The
   code is not bundled and the route does not exist.
2. **Verified after the fact.** `npm run verify:routes` reads the route manifest
   the build actually emitted and fails on anything matching the forbidden list.
   The `Production build` job runs it.
3. **Inert even if reached.** Every state-writing helper in
   `lib/billing/mock.ts` refuses when the surface is disabled, so no route and
   no billing-provider call can mint paid access.

`VERCEL_ENV=production` disables the surface unconditionally — **no environment
variable, including `MOCK_BILLING_PREVIEW`, can turn it back on in
production.** Preview deployments opt in with `MOCK_BILLING_PREVIEW=true`, and
local development has it on by default, so fixture flows keep working.

### OneLingo's public pages

OneLingo is a complete product — Prisma models, editorial cron, admin panel,
Gemini brain — that is deliberately **not sold publicly**. It was left out of
the public site during the OneRead umbrella rework, but its landing pages were
never removed, and `/lingo/subscribe` still opened a Polar checkout of its own:
a second paid path, outside the $1 OneRead subscription, reachable by anyone
who knew the URL.

The four public pages (`/lingo`, `/lingo/pricing`, `/lingo/subscribe`,
`/lingo/subscribe/success`) are therefore excluded from production by the same
mechanism, using the `page.hidden.tsx` extension. They still build in
development, so the product stays revivable — set `ONELINGO_PUBLIC_PAGES=true`
on a preview deployment to review them.

**The rest of OneLingo ships normally and is in scope**: `/api/lingo/*`,
`/api/cron/one-lingo`, `/admin/one-lingo/*` and the admin action endpoint are
untouched, so the editorial team keeps its panel and the pipeline keeps
running. A regression test asserts that ban stays narrow.

To sell OneLingo publicly again, drop the `lingo-public-pages` rule from
`lib/security/route-policy.mjs` and rename the four pages back to `page.tsx`.

The policy itself lives in `lib/security/route-policy.mjs`, which the build,
the CI guard and the test suite all import. To ban another route, add a pattern
and a reason there.

## Product flow

1. The reader enters an email at `/subscribe`.
2. A six-digit verification code proves inbox ownership.
3. The reader configures OneArticle, OneFilm or both.
4. One shared Polar checkout activates the OneRead subscription.
5. A signed Polar webhook updates billing access.
6. Scheduled, editor-approved editions are dispatched by Vercel cron.

Email delivery preference and paid-plan status are separate. The link in an
edition stops future emails immediately; paid renewal is managed through the
verified Polar customer portal.

## Editorial operations

The production pipeline does not generate or schedule an edition
autonomously. An editor creates an edition in `/admin`, validates its source
and copy, sends a test, marks it ready and schedules it. Cron only claims due
scheduled editions and records idempotent recipient deliveries.

- OneArticle dispatch: `/api/cron/daily`
- OneFilm dispatch: `/api/cron/one-film`
- Expected delivery time: 07:00 Europe/Istanbul

Missing-edition, zero-delivery and failed-run alerts are sent to `ADMIN_EMAIL`.

## Production

Merging to `main` is the release. The Vercel Git integration is the only source
of a normal production deployment, and a build guard refuses any production
build that cannot be reproduced from a commit on `main`. `npm run release:verify`
reports what the production domain is actually serving and where it came from.

Deployment and incident procedures, including the emergency deploy path, are in
[`docs/LAUNCH_RUNBOOK.md`](docs/LAUNCH_RUNBOOK.md). Never commit real secrets.
Use `.env.example` as the configuration contract and store production values in
Vercel.
