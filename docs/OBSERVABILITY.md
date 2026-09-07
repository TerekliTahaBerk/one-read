# Launch-critical observability taxonomy

Runtime logs and Sentry events emitted through `reportOperationalEvent` use the
same fields. Values are stable slugs so an incident can be filtered without
reading an error message.

| Field | Contract |
| --- | --- |
| `subsystem` | `billing`, `verification`, `polar_webhook`, `resend_webhook`, `cron`, `delivery`, or `reconciliation` |
| `product_key` | Registry offer/product key; never an email or provider customer id |
| `operation` | Stable action slug, such as `create_checkout` or `send_editorial` |
| `outcome` | Stable result slug |
| `state` | State-machine or processing-stage slug |
| `environment` | `VERCEL_ENV`, falling back to `NODE_ENV` |
| `release_sha` | First 12 characters of `VERCEL_GIT_COMMIT_SHA`, when present |
| `correlation_id` / `run_id` | First 16 hex characters of a SHA-256 hash; raw ids are not emitted |
| `retry_classification` | `not_retryable`, `retryable`, `provider_retry`, or `reconciliation_required` |
| `error_code` | Stable provider/application/database code, not an error message |
| `severity` | `CRITICAL`, `ERROR`, `WARNING`, or `INFO` |
| `alertable` | Pager/incident-policy eligibility; business outcomes are `false` |
| `action` | Stable, PII-safe operator next step |
| `provider` / `failure_class` | Provider and explicit failure-policy slug |

## Privacy boundary

All structured fields pass through the shared Sentry scrubber before they are
logged or attached to Sentry. Never supply an email address, verification code,
raw token, webhook secret/signature, raw provider payload, checkout URL, or
database URL as context. The scrubber is defence in depth and filters sensitive
key names, emails, bearer credentials, database URLs, and secret URL parameters.

Provider event/message ids and database row ids must go through the helper's
`correlationId` or `runId` fields. Add a raw provider id only after its contract
has been reviewed and explicitly documented as non-sensitive.

## Polar and Resend failure policy

The executable source of truth is `PROVIDER_FAILURE_POLICY` in
`lib/provider-observability.ts`. All occurrences use the `provider_operation`
event and a stable `provider + operation + failure_class` Sentry fingerprint.
This groups repeated outages without sampling or hiding occurrences. Alerts
must filter on `alertable:true`; `severity:CRITICAL` is the launch pager class.

| Provider / class | Severity | Alert? | Operator action |
| --- | --- | --- | --- |
| Polar checkout config invalid | CRITICAL | yes | Fix credentials/product mapping and run a controlled checkout |
| Polar checkout provider/network failure | ERROR | yes | Inspect provider status and retry the individual checkout |
| Polar webhook secret missing | CRITICAL | yes | Restore the secret and redeliver missed events |
| Polar invalid signature | WARNING | no | Investigate only sustained volume or rejected legitimate events |
| Polar webhook processing failure | ERROR | yes | Fix runtime processing and allow provider redelivery |
| Polar unknown product/correlation | ERROR | yes | Reconcile against Polar; never guess entitlement |
| Polar duplicate/stale/unsupported event | INFO | no | None; deterministic safe outcome |
| Resend API/domain/sender/webhook config invalid | CRITICAL | yes | Repair configuration before resuming sends |
| Resend hard send rejection | ERROR | yes | Correct and retry only the failed delivery |
| Resend ambiguous outcome | ERROR | yes | Reconcile provider acceptance; never auto-resend |
| Resend accepted but local persistence failed | ERROR | yes | Retry the same key inside the provider idempotency window |
| Resend idempotency window expired | ERROR | yes | Resolve via delivery reconciliation workflow |
| Resend invalid webhook signature | WARNING | no | Investigate only sustained volume or legitimate failures |
| Resend webhook processing failure | ERROR | yes | Fix processing and redeliver the correlated event |
| Bounce, complaint, or user unsubscribe | INFO | no | Preserve suppression; no incident |

Provider config validation is also a deployment gate (`verify:launch` and
`verify:resend`). A real Sentry/monitor event still requires a controlled
production-equivalent failure injection after deployment; do not use customer
addresses or raw provider identifiers as evidence.

### Post-deploy manual gate

1. In a controlled preview or production smoke window, inject one invalid
   Polar signature and one invalid Resend signature. Confirm both events have
   `alertable:false`, a hashed `correlation_id`, and no request body, email,
   signature, token, or raw provider id.
2. Use provider test mechanisms (never a customer address) for one Resend hard
   failure and a sandbox Polar checkout failure. Confirm `provider`,
   `operation`, `failure_class`, `severity`, `action`, and
   `retry_classification` are searchable.
3. Filter evidence by `release_sha` and deployment `environment`, and timestamp
   it after the deployment. Do not count historical events as new-release
   evidence.
4. Configure the external monitor with `alertable:true AND severity:CRITICAL`
   for paging. Route `alertable:true AND severity:ERROR` to the operator queue;
   do not page on `WARNING` or `INFO`.

## Migration notes

The launch-critical audit found three incompatible patterns: cron-only tag names
(`cron_product`, `cron_stage`, and related fields), a free-form
`subsystem=settings-store`, and route-specific `console.error` prefixes. It also
found error messages reaching logs without the same scrubbing applied by Sentry,
plus narrow redaction that did not cover raw payload aliases, database URLs,
bearer values, or checkout secrets. New launch-critical signals must use the
canonical helper rather than introducing another tag vocabulary.
