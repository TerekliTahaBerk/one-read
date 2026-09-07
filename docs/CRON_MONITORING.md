# Cron monitoring contract

Vercel evaluates both schedules in UTC. `Europe/Istanbul` is UTC+3 year-round.

| Job | Vercel schedule | Product-time meaning | Healthy completion |
| --- | --- | --- | --- |
| OneArticle Daily | `*/10 * * * *` | Poll every 10 minutes. A due issue is dispatchable only Monday-Friday in its IANA timezone (`Europe/Istanbul` by default). | The `OperationalRun` is durably `SUCCESS`, including a normal poll with no due issue. |
| OneNews | `0 16 * * *` | Health poll daily at 19:00 Europe/Istanbul; dispatch only Monday, Wednesday and Friday. | The `OperationalRun` is durably `SUCCESS`, including a non-publication-day/no-due-work poll. |

`no due work` is a healthy scheduler result: the route, auth, database, runtime
controls and required delivery provider were usable, but no issue was eligible at
that instant. It may emit a success heartbeat. A missing editorial edition in the
expected product window is a separate, once-per-product/day operator alert.

Auth rejection opens no run and emits no success heartbeat. An exception, an
unavailable database/provider, any unresolved recipient failure, or failure to
durably close the run also emits no success heartbeat. Duplicate/overlapping
invocations may each create a successful no-op run, but delivery claims and unique
rows prevent a duplicate email; these healthy invocations do not create success
ambiguity because each monitor ping follows its own successful `OperationalRun`.

## Better Stack setup (manual production gate)

Create two independent heartbeats and store only their secret ping URLs in Vercel
Production environment variables:

- `BETTER_STACK_DAILY_CRON_HEARTBEAT_URL` — name `OneRead / cron / daily`; expect
  every 10 minutes; grace 10 minutes; notify the primary operator email and the
  incident escalation policy.
- `BETTER_STACK_NEWS_CRON_HEARTBEAT_URL` — name `OneRead / cron / news`; expect
  every 24 hours with a 15-minute grace. The daily 19:00 Europe/Istanbul health
  poll intentionally avoids an interval monitor hiding a Friday-to-Monday miss.

Use immediate incident confirmation so the first missed expected window or an
explicit monitor failure is visible. Configure a 20-minute recovery period (two
healthy Daily intervals) to avoid resolve/reopen noise. Better Stack maintains one
incident for a continuing missed-heartbeat condition, so repeated application
failures do not create one notification per poll; Sentry groups the PII-free
`cron_failure` events by product, stage and code. Never put a heartbeat URL in a
log, ticket, screenshot, or `OperationalRun` metadata.

The run metadata records the non-secret monitor key (`daily` or `news`) and
heartbeat eligibility, while `cron_failure` events carry the `OperationalRun` id
when a healthy run cannot reach the monitor. This is the correlation key between
the admin run history, Vercel logs and Sentry; Better Stack's timestamp identifies
the corresponding successful completion window.

## Controlled proof

For each enabled job, use an operator-owned fixture and record timestamps/IDs in
the launch evidence:

1. Invoke with an invalid bearer token. Verify 401, no `OperationalRun`, and no
   heartbeat timestamp advance.
2. Invoke an authorized healthy no-op or controlled delivery. Verify `SUCCESS`
   and that only the matching monitor advances.
3. Temporarily pause the matching Vercel cron (or pause the test caller, never the
   production delivery code), wait through frequency plus grace, and verify one
   incident reaches both configured notification destinations.
4. Restore scheduling, invoke one healthy run, and verify recovery. Record the
   Better Stack incident URL, notification receipt timestamp, Vercel invocation,
   and `OperationalRun` id. Do not paste secret ping URLs.

Provider UI configuration and notification delivery cannot be proven from the
repository. Production remains a manual gate until those four evidence items are
captured.
