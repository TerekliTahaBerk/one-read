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
npm test
npm run lint
npm run build
npm audit --omit=dev
```

All four checks are release gates.

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
