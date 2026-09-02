# OneNews delivery operations

OneNews sends only scheduled, human-approved, currently valid editions. The
Vercel cron calls `GET /api/cron/news` at 16:00 UTC on Monday, Wednesday and
Friday. An editor may schedule a different due time, but deployment alone does
not activate sending: production requires `ONENEWS_DELIVERY_ENABLED=true`.

## State semantics

Logical delivery state describes OneRead's provider request: `QUEUED`,
`SENDING`, `SENT` (accepted), `FAILED`, `SKIPPED`, or
`RECONCILIATION_REQUIRED`. Provider state is separate: `ACCEPTED`, `DELIVERED`,
`DELAYED`, `FAILED`, `BOUNCED`, or `COMPLAINED`. Never report `SENT` as mailbox
delivery; only a signed provider event establishes `DELIVERED`.

The issue becomes `SENT` when every logical row is resolved,
`PARTIALLY_FAILED` when at least one send succeeded and another remains
unresolved, and `FAILED` when none succeeded. Better Stack receives a healthy
heartbeat only after the OperationalRun is durably closed without recipients
requiring attention.

## Incident playbook

### Missed cron

Check the latest OneNews `OperationalRun`, Vercel cron invocation, cron secret,
delivery enable flag, Resend configuration, and whether a valid approved issue
was actually due. Correct the dependency and invoke the authenticated cron;
database claiming and delivery uniqueness make overlapping invocations safe.

### Partial failure

Inspect failed rows and their attempt counts. Use the authenticated
`retry-failed` admin action; it queues only failed rows, and dispatch rechecks
entitlement, product email preference, language, and suppression immediately
before sending. Successful rows are untouched.

### Ambiguous delivery

`SENDING` can mean Resend accepted the message but local persistence failed.
Within Resend's shared idempotency retention window, the stable key can recover
safely. After that window the row becomes `RECONCILIATION_REQUIRED`; do not
automatically retry. Investigate the provider first. The separate
`recover-ambiguous` action requires explicit duplicate-risk confirmation and
is audited.

### Resend outage

Leave provider-call failures as `FAILED`; retry only after service recovery.
Do not reset attempts in bulk. Provider-accepted ambiguous rows follow the
reconciliation procedure above.

### Database outage

First determine whether the provider accepted any requests. Preserve the
delivery rows and timestamps. Never delete them or create a replacement issue
to force a resend. A retry inside the provider window must reuse the existing
issue/contact idempotency key.

### Bounce or complaint spike

Check signed webhook health and provider diagnostics. Bounce and complaint
events suppress every subscription row for the address, across OneArticle and
OneNews, without changing billing. Do not unsuppress until the address and
operator decision are verified.

### Corrections

Editorial correction records remain append-only and human-decided. C4 does
not automatically send correction mail: a queued decision is an operator flag,
not authority for cron to email readers.
