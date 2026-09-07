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

## Privacy boundary

All structured fields pass through the shared Sentry scrubber before they are
logged or attached to Sentry. Never supply an email address, verification code,
raw token, webhook secret/signature, raw provider payload, checkout URL, or
database URL as context. The scrubber is defence in depth and filters sensitive
key names, emails, bearer credentials, database URLs, and secret URL parameters.

Provider event/message ids and database row ids must go through the helper's
`correlationId` or `runId` fields. Add a raw provider id only after its contract
has been reviewed and explicitly documented as non-sensitive.

## Migration notes

The launch-critical audit found three incompatible patterns: cron-only tag names
(`cron_product`, `cron_stage`, and related fields), a free-form
`subsystem=settings-store`, and route-specific `console.error` prefixes. It also
found error messages reaching logs without the same scrubbing applied by Sentry,
plus narrow redaction that did not cover raw payload aliases, database URLs,
bearer values, or checkout secrets. New launch-critical signals must use the
canonical helper rather than introducing another tag vocabulary.
