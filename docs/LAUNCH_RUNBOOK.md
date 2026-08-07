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

**Merging to `main` is the release.** There is exactly one way a normal
production deployment is created: the Vercel Git integration builds the merged
commit. Do not run `vercel --prod`, and do not redeploy from the dashboard —
both produce a second artifact for a commit that already has one.

1. Review `git diff` and commit the exact release.
2. Run:

   ```bash
   npm test
   npm run lint
   npm run build
   npm audit --omit=dev
   npx prisma migrate status
   ```

3. Open a pull request and merge it into `main`. Vercel builds and promotes
   that commit; the **Production release** workflow then verifies the
   deployment's provenance and applies any pending migrations.
4. Confirm the release is the one you intended:

   ```bash
   npm run release:verify
   ```

5. Confirm `/`, `/subscribe`, `/pricing`, `/article`, `/film`, `/terms`,
   `/privacy`, `/robots.txt` and `/sitemap.xml`.
6. Open `/admin/settings` and verify every readiness signal.
7. Perform one controlled subscriber journey before enabling public traffic.

## Release provenance

A production artifact must be rebuildable from a commit on `main`. Three guards
enforce that, and each covers what the previous one cannot:

| Guard | Runs | Blocks |
| --- | --- | --- |
| `scripts/verify-build-provenance.mjs` | inside every Vercel build (`vercel.json` build command) | production builds whose sources differ from the claimed commit, whose commit is not on `main`, or that carry no commit at all |
| `scripts/deploy-production.mjs` | the emergency CLI path | dirty trees, unpushed commits, and second deployments of a commit that already has one |
| `scripts/verify-release-provenance.mjs` | `npm run release:verify`, the release workflow, and a nightly audit | a production domain pointing at an unverifiable artifact, and duplicate deployments per commit |

The build guard is the load-bearing one: it runs whatever created the
deployment, so a failed check means the build errors and the production domain
keeps serving the previous good artifact. It proves cleanliness directly by
comparing every tracked file against the commit's tree on GitHub — Vercel's
`gitDirty` flag lives on the deployment record and is not readable from inside
a build.

Rules are enforced from `ENFORCED_FROM` in `scripts/release/provenance.mjs`
onward. Deployments before that date contain known duplicates and dirty
artifacts; the audit reports them and does not fail on them.

Configuration this depends on:

- Repository secrets: `VERCEL_TOKEN` (read access for the audit),
  `PRISMA_DATABASE_URL` (production database for migrations).
- Repository variable: `VERCEL_SCOPE` (`tereklitahaberks-projects`).
- Optional Vercel environment variable: `RELEASE_GITHUB_TOKEN`, a read-only
  token that lifts the build guard off GitHub's 60 requests/hour
  unauthenticated limit. Add it if builds start failing with
  `provenance_unverifiable`.

### Emergency deploy

Only for a Git-integration outage or a rollback to an older commit. It still
refuses a dirty tree, an unpushed commit, and a commit that already has a
production deployment.

```bash
npm run deploy:emergency -- --reason "vercel git integration outage, INC-14"
```

Nothing is uploaded without `--yes`; run it once to read the plan, then again
with `--yes`. The reason is stamped into the deployment metadata as
`releaseChannel=emergency`, which is what the audit uses to tell a deliberate
emergency deploy apart from a stray `vercel --prod`. Verify afterwards with
`npm run release:verify`.

If the build guard itself is the thing that is broken, set
`RELEASE_PROVENANCE_GUARD=off` in the Vercel project's environment variables.
It is a project setting rather than a flag so that turning it off is a
deliberate, recorded act, and every build log says loudly that the artifact is
unverified. Remove it as soon as the incident is over.

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

- Prefer promoting the last known-good production deployment in Vercel: it is
  the same verified artifact, so nothing is rebuilt and nothing new is created.
- If it must be rebuilt, check out the known-good commit and use the emergency
  path above. It permits an older commit — it only requires that the commit is
  on `main` — and it will tell you that production is being rolled back.
- Do not roll back an applied database migration destructively.
- Keep forward-compatible migrations and ship a corrective migration instead.
  Migrations are applied after the deployment goes live, so a release must work
  against both the old and the new schema.

## Weekly checks

- Review failed/skipped deliveries and operational alerts.
- Confirm the next seven days of Article and next two Film editions.
- Check Polar disputes, failed payments and payout readiness.
- Check Resend bounce/complaint rates.
- Review Sentry regressions and dependency advisories.
- Export a subscriber backup from the admin panel and store it securely.
