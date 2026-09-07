# Operator recovery queue

Open `/admin/operations/queue` with an authenticated admin session. It combines confirmed delivery failures, ambiguous/provider-unresolved delivery, billing reconciliation outcomes, and failed cron runs. Rows contain masked correlations only; use the provider dashboard for underlying evidence.

## Delivery state machine

`FAILED` with no provider acceptance evidence may be retried. The action re-reads recipient eligibility and delivery state inside one transaction, then compare-and-sets `FAILED → QUEUED`; a stale view or concurrent click is refused. Suppressed/canceled recipients are refused. The same transaction records before/after state, actor, target, and timestamp in `AdminAuditLog`.

`RECONCILIATION_REQUIRED`, `DELAYED`, and accepted-but-unresolved deliveries are never resent from this surface. First find the masked correlation in Resend and wait for or obtain terminal provider evidence. Provider webhooks remain the normal reconciliation path.

## Billing and cron

Billing rows come from the reconciliation outcomes defined by the Phase 1 billing contract. Diagnose with `npm run reconcile:billing -- --subscription=<id>` and use `npm run repair:billing` only after reviewing its dry run. That primitive applies provider evidence with compare-and-set guards and audit events; the queue does not grant `ACTIVE_PAID` or invent entitlement.

Failed cron rows show the affected count and safe run correlation. Inspect `/admin/runs` before deciding whether the owning cron contract permits another invocation.
