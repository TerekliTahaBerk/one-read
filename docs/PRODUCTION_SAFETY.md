# Production safety operations

OneArticle is the only active production product. OneFilm, OneLingo, Blog, and
mobile work are postponed; their historical database data is retained.

## Unsubscribe

Human email links open `/unsubscribe`, whose GET only renders a confirmation.
The deliberate form POST suppresses email and never changes Polar billing.
Mailbox-provider RFC 8058 requests use `POST /api/unsubscribe`; it is generic
and idempotent.

## Dispatch and recovery

`/api/cron/daily` intentionally polls every 10 minutes. Editors choose the
delivery instant; polling keeps arbitrary scheduled times within a 10-minute
latency bound instead of coupling sends to one fixed cron hour. Vercel evaluates
cron expressions in UTC, while `scheduledFor` is stored as an absolute instant.
The dispatcher permits sends only Monday-Friday in the issue's IANA timezone
(`Europe/Istanbul` by default, UTC+3 year-round), so DST or host timezone cannot
change the weekday decision. A weekend-due issue remains scheduled for Monday.

An edition is claimed with an atomic dispatchable-state → `SENDING` update. A
second compare-and-set claim guards each recipient before provider I/O. A unique
`(issueId, contactId)` delivery row and stable Resend idempotency key prevent
normal duplicate sends when cron repeats or overlaps. Known-success rows are
never retried, a live `SENDING` claim is left alone for 15 minutes, and
eligibility/suppression is checked again before each retry.

Known failures are retried by the next 10-minute poll; automatic delivery
attempts stop after three. The admin **Retry failed
deliveries** action explicitly resets failed rows after review. If Resend may
have accepted a request but local persistence failed, the stable key may be
retried only within Resend's 24-hour idempotency window. After that the row is
`RECONCILIATION_REQUIRED`; automatic sending stops until an operator uses the
separate **Authorize ambiguous resend** action, which warns about duplicate
risk.

`SENT` means Resend accepted the message, not that the recipient opened or
received it; the admin UI therefore labels this count **Accepted**.

Any non-zero failed count makes the issue `PARTIALLY_FAILED` (or `FAILED` when
nothing succeeded), closes its `OperationalRun` as failed, emits PII-free Sentry
context, and returns HTTP 200 with `attentionRequired: true`. The 200 avoids an
unsafe whole-batch platform retry while preserving a machine-detectable result.

## Monitoring

- Sentry: exceptions and PII-free cron/delivery failure context.
- `OperationalRun`: durable run outcome and recipient counts in the admin UI.
  For editorial runs, the legacy `generatedCount` field is displayed as
  **Attempted**; metadata also records eligible, attempted, accepted, failed,
  skipped, and reconciliation-required counts.
- Better Stack uptime monitor: `https://www.oneread.email/`, check every 3
  minutes, alert after 2 failures.
- Better Stack heartbeat: configure `BETTER_STACK_CRON_HEARTBEAT_URL` in Vercel.
  Use a 10-minute expected interval and a 10-minute grace period. OneRead pings
  only after a recorded healthy cron completion; partial or failed runs do not
  report healthy. Missing configuration is a safe no-op.

Send alerts to the primary operator's email plus the established incident
destination. Never paste the heartbeat URL into logs, tickets, or screenshots.
