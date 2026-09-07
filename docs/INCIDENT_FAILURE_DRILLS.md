# Phase 2 incident failure drills

This is the final launch gate for detection → triage → diagnosis → safe recovery
→ verification. Run it with the on-call operator who would handle the launch.
Do not create a destructive production failure. Use provider test events,
operator-owned contacts, paused test callers, read-only queries, and local test
fixtures. Redact email addresses, tokens, webhook secrets, heartbeat URLs, and
full provider identifiers from retained evidence.

## Gate rules

1. Start an incident timeline and record the operator, UTC start/end, deployed
   commit, environment, and affected product. Use masked correlation IDs only.
2. Run `npm run drill:incidents` locally or in CI and retain its output. It
   exercises the failure classifications, idempotency boundaries, webhook
   ordering, billing compare-and-set repairs, cron monitoring contract, and
   database release guard without provider or production writes.
3. Perform each controlled operator drill below. Every drill must include a
   real detection surface and a post-recovery check. Mark the gate failed if an
   operator uses a forbidden action, cannot determine blast radius, or cannot
   correlate provider evidence with durable local state.
4. Keep public checkout or the affected delivery switch off when the state is
   uncertain. Recovery means restoring a proven invariant, not making an alert
   disappear.

Safe surfaces used below are `/admin/launch`, `/admin/runs`,
`/admin/operations/queue`, Vercel invocation/runtime logs, Sentry, Better Stack,
the Polar event/subscription views, and the Resend email/event views. Opening
these surfaces is read-only. Commands that query production must be run with the
exact protected production environment and their output must be treated as
sensitive operational evidence.

## 1. Cron missed or failed

- **Detection signal / severity:** Better Stack missed heartbeat or Sentry
  `cron_failure`; SEV-2 when an expected launch delivery window can be missed,
  otherwise SEV-3 for a healthy no-work poll failure.
- **First checks:** identify Daily vs News, confirm the expected UTC cadence,
  check the latest Vercel invocation and `/admin/runs`, and correlate the
  `OperationalRun` ID. An auth 401 intentionally creates neither a run nor a
  healthy heartbeat.
- **Blast radius:** product, missed windows, run status, eligible/attempted/
  accepted/failed counts, and whether any provider IDs already exist.
- **Safe diagnosis:** follow `docs/CRON_MONITORING.md`; inspect the surfaces
  above. Simulate by pausing only the controlled test caller or matching Vercel
  cron, never by breaking production code or data.
- **Allowed recovery:** restore the schedule; invoke one authorized controlled
  no-op or fixture run only after confirming the owning job's idempotency
  contract. Keep delivery disabled if recipient state is uncertain.
- **Forbidden:** deleting runs/deliveries, resetting all attempts, widening
  eligibility, or replaying a whole batch with existing provider acceptance.
- **Verification:** one new `SUCCESS` run; matching heartbeat advances; the
  other monitor does not; delivery-row/provider-ID cardinality remains one.
- **Escalation / rollback:** disable the affected delivery switch and escalate
  to platform/provider owners if auth, database, or provider health is not
  restored in the current window.
- **Retain:** incident URL and notification receipt, invocation ID, run ID,
  masked delivery correlations, before/after timestamps, and command output.

## 2. Prisma, schema, or runtime critical error

- **Detection signal / severity:** failed deployment/migration status, HTTP 5xx,
  Sentry runtime exception, or Prisma error such as P2022; SEV-1 if the public
  critical path is unavailable or writes may be inconsistent, else SEV-2.
- **First checks:** stop promotion, identify the first failing release and
  route, compare the deployed commit with the migration history, and determine
  whether the error is read-only, write-path, or build-time.
- **Blast radius:** affected routes/products, first/last occurrence, successful
  writes after deploy, and all jobs using the same database.
- **Safe diagnosis:** `npm run release:verify`, `npm run release:database`, and
  provider/Vercel/Sentry views. The controlled simulation is
  `scripts/release/database-guard.test.mjs`, which injects command failures and
  never opens a database connection.
- **Allowed recovery:** halt deployment; set product kill switches; roll code
  back only to a schema-compatible artifact; roll forward with an additive
  migration after review.
- **Forbidden:** `prisma migrate reset`, destructive SQL, editing migration
  history, dropping columns/tables, or deploying an older schema-incompatible
  build.
- **Verification:** clean migration status, critical routes healthy, one
  controlled read/write flow succeeds, cron completes durably, and no new
  matching Sentry errors appear during the observation window.
- **Escalation / rollback:** database owner plus release owner approval is
  required for any data repair. Prefer kill switches and a compatible code
  rollback while the schema remains forward-compatible.
- **Retain:** deploy/commit IDs, migration status, redacted error/fingerprint,
  impacted routes, decisions, and verification timestamps.

## 3. Polar webhook processing failure and reconciliation

- **Detection signal / severity:** failed Polar delivery, unprocessed
  `BillingEvent`, `polar_webhook` error, or paid/local state mismatch; SEV-2 when
  access or charging truth diverges.
- **First checks:** validate signature/config health, locate the provider event
  and local event outcome, then identify the exact subscription with masked
  correlations.
- **Blast radius:** event type/product, all events since the last applied event,
  unmatched/unrecognized counts, and entitlements affected.
- **Safe diagnosis:** `npm run reconcile:billing -- --subscription=<local-id>`
  plus Polar and `/admin/launch`. The command is read-only.
- **Allowed recovery:** ask Polar to redeliver the signed event; if divergence
  remains, review `npm run repair:billing` dry-run output and apply only the
  recommended preconditioned action with provider evidence.
- **Forbidden:** manually granting `ACTIVE_PAID`, inventing provider IDs,
  applying stale snapshots, or deleting/rewriting billing events.
- **Verification:** rerun reconciliation; zero required anomalies; expected
  provider-confirmed entitlement; event is processed once; critical-path smoke
  passes for the controlled identity.
- **Escalation / rollback:** disable checkout if new events cannot reconcile;
  escalate ambiguous money/access outcomes to billing owner and provider.
- **Retain:** masked event/subscription IDs, event type/time/outcome, diagnosis,
  repair dry-run and audit ID, webhook redelivery result, and final report.

## 4. Resend hard send failure

- **Detection signal / severity:** delivery `FAILED`, provider `FAILED`, failed
  `OperationalRun`, or Sentry delivery failure; SEV-2 for broad failure, SEV-3
  for an isolated controlled recipient.
- **First checks:** prove there is explicit pre-acceptance failure evidence;
  check attempt count, suppression/eligibility, issue state, and provider events.
- **Blast radius:** issue, recipient count, affected domain, failure code, and
  whether any sibling deliveries were accepted.
- **Safe diagnosis:** `/admin/operations/queue`, `/admin/runs`, Resend event
  view, and Sentry. Use a Resend test event or mocked transport failure.
- **Allowed recovery:** allow the normal retry (under three attempts), or use
  **Retry failed deliveries** after review when attempts are exhausted. The
  action rechecks eligibility and compare-and-sets `FAILED → QUEUED`.
- **Forbidden:** retrying `SENT`, `DELAYED`, `RECONCILIATION_REQUIRED`, bounced,
  complained, unsubscribed, or canceled recipients; resetting attempts in bulk.
- **Verification:** exactly one canonical row and stable idempotency key; one
  new attempt; accepted provider ID or a newly classified failure; audit event
  for manual recovery.
- **Escalation / rollback:** pause delivery for systemic provider failure and
  escalate to Resend; do not convert an outage into mass manual retries.
- **Retain:** run/issue IDs, masked delivery/provider correlation, classification,
  attempts before/after, operator audit ID, and terminal provider result.

## 5. Ambiguous delivery outcome — no automatic resend

- **Detection signal / severity:** transport exception after request dispatch,
  success-shaped response without an ID, expired idempotency window, or
  `RECONCILIATION_REQUIRED`; SEV-2 because duplicate delivery is possible.
- **First checks:** freeze retry, note the stable idempotency key age, search
  Resend using the masked correlation and time window, and inspect webhooks.
- **Blast radius:** every unresolved row for that issue/run and whether the
  provider may have accepted the request.
- **Safe diagnosis:** queue, Resend events, Vercel logs, and webhook history.
- **Allowed recovery:** wait for terminal provider evidence or reconcile it.
  **Authorize ambiguous resend** is a last-resort human decision only after
  explicit duplicate-risk acceptance and recipient revalidation.
- **Forbidden:** automatic resend, converting ambiguity to `FAILED` without
  evidence, changing the idempotency key, or batch replay.
- **Verification:** reconciliation resolves to one canonical outcome; no second
  message when acceptance existed; any exceptional resend is audited.
- **Escalation / rollback:** keep that row stopped and escalate to delivery owner
  if provider evidence remains unavailable; do not trade uncertainty for speed.
- **Retain:** uncertainty source, idempotency age (not secret/key value), masked
  correlation, provider search result, decision owner, and audit record.

## 6. Retryable failure — duplicate-safe recovery

- **Detection signal / severity:** explicit provider/local `FAILED` with no
  acceptance evidence; SEV-3 isolated or SEV-2 systemic.
- **First checks:** confirm retry classification, attempts, current eligibility,
  suppression, issue state, and absence of acceptance/delivery events.
- **Blast radius:** recipient/domain/failure-code cohort and affected issue.
- **Safe diagnosis:** queue, run counts, Resend events, and Sentry fingerprint.
- **Allowed recovery:** normal retry or reviewed queue action; concurrent clicks
  must lose the compare-and-set race and the stable idempotency key must remain.
- **Forbidden:** creating a new delivery row/key, bypassing the attempt cap, or
  retrying an ineligible/suppressed contact.
- **Verification:** one row, one successful claim, at most one provider
  acceptance, correct run counts, and a manual-action audit when applicable.
- **Escalation / rollback:** pause the product if the cohort indicates an outage;
  stop after the retry budget and investigate rather than loop.
- **Retain:** before/after state, attempts, masked correlation, competing-action
  result, provider terminal event, and audit ID.

## 7. Bounce or complaint suppression

- **Detection signal / severity:** signed `email.bounced` or
  `email.complained` webhook; normally a policy event, SEV-2 only for a sudden
  broad spike or suspected signing failure.
- **First checks:** verify signature/freshness, recipient mapping, event time,
  and whether suppression was applied. Use only a provider-controlled test
  address/event.
- **Blast radius:** bounce/complaint rate by issue/domain and all contacts not
  yet suppressed after a terminal event.
- **Safe diagnosis:** Resend webhook/event views, `/admin/launch`, queue, and
  PII-free logs.
- **Allowed recovery:** preserve `SUPPRESSED`; correct a webhook/config outage
  and redeliver signed provider events. Customer controls cannot unsuppress it.
- **Forbidden:** resend, bulk unsuppress, treating bounce/complaint as transport
  retryable, or accepting an unsigned/replayed webhook.
- **Verification:** provider terminal status plus local suppression; subsequent
  eligibility refuses delivery; duplicate/older events do not regress state.
- **Escalation / rollback:** pause delivery and contact Resend for a spike or
  authentication outage; investigate list/source health before resuming.
- **Retain:** aggregate rate, masked test correlation, signature verdict (never
  secret), provider event type/time, local state, and refusal evidence.

## 8. Billing/provider-local divergence

- **Detection signal / severity:** reconciliation anomaly, support report, paid
  without provider confirmation, provider-active/local-inactive, stale event,
  or unknown product; SEV-2, SEV-1 only for broad incorrect charging/access.
- **First checks:** compare provider snapshot time/product/status with the local
  row and applied event history; identify whether a newer webhook may race.
- **Blast radius:** offer/product/status cohort, unmatched events, and granted or
  withheld entitlements.
- **Safe diagnosis:** `npm run reconcile:billing -- --subscription=<local-id>`,
  `npm run inspect:billing`, Polar, and `/admin/launch`.
- **Allowed recovery:** provider redelivery or a dry-run-reviewed, audited repair
  whose compare-and-set precondition still holds.
- **Forbidden:** direct status/entitlement edits, applying unknown or stale
  provider state, re-pointing an established correlation, or assuming a legacy
  product is a current bundle.
- **Verification:** clean reconciliation, exact offer identity, entitlement
  matches provider truth, concurrent newer webhook wins, and audit contains no
  email or raw provider secret.
- **Escalation / rollback:** disable checkout for systemic mapping/config drift;
  billing owner handles charge/refund decisions separately from local access.
- **Retain:** masked correlations, provider snapshot timestamp, anomaly codes,
  repair plan/result, audit ID, and post-repair report.

## 9. Launch funnel degradation detection

- **Detection signal / severity:** `/admin/launch` stage conversion drops,
  delivery/reconciliation failures rise, unprocessed billing events accumulate,
  failed runs increase, or the latest run is stale/failed; SEV-2 for a material
  checkout/entitlement/delivery break, SEV-3 for early weak signal.
- **First checks:** select the exact offer and compare setup → verification
  requested → confirmed → checkout → provider-confirmed entitlement → first
  accepted delivery. Check failures and latest run beside the funnel.
- **Blast radius:** offer, stage, start time, traffic cohort, provider, and the
  difference between counts. Do not mix unidentified legacy rows into launch.
- **Safe diagnosis:** `/admin/launch`, analytics for acquisition context,
  `/admin/runs`, queue, Sentry, Polar, and Resend. Use durable server-authored
  state as truth for billing/delivery.
- **Allowed recovery:** disable public checkout for billing-stage degradation;
  disable the affected delivery switch for delivery-stage degradation; fix or
  reconcile the named subsystem, then reopen gradually.
- **Forbidden:** backfilling funnel stages, granting paid access to improve a
  count, deleting failures, or treating browser analytics as billing truth.
- **Verification:** controlled canary traverses every expected stage, failure
  counters stop growing, latest run succeeds, provider/local reconciliation is
  clean, and monitoring remains healthy through the observation window.
- **Escalation / rollback:** launch owner decides go/no-go; keep the relevant
  switch off until two independent signals (durable local state plus provider or
  monitor evidence) agree.
- **Retain:** offer-filtered before/after snapshot, time window and denominators,
  relevant run IDs, masked provider correlations, switch changes, and decision.

## Evidence record and pass criteria

Create one record per drill with: scenario number; operator/observer; UTC
timestamps; commit/deployment; detection screenshot or event; declared
severity; first checks; blast radius; commands/surfaces used; recovery decision;
forbidden-action check; verification result; escalation/rollback decision; and
links to redacted evidence. Do not store secrets or customer PII.

The final gate passes only when all nine records are `PASS`,
`npm run drill:incidents` passes at the deployed commit, provider-facing drills
use controlled identities/events, and the operator can explain why ambiguity,
bounce/complaint, billing truth, and schema recovery each forbid their unsafe
shortcut. Any unresolved ambiguous delivery, billing divergence, failed cron,
or critical runtime error is a launch blocker.
