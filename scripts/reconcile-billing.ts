/**
 * Billing reconciliation — the operator's read-only diagnosis tool.
 *
 * Three modes, none of which write anything:
 *
 *   npm run reconcile:billing
 *       Fleet sweep. Counts divergences by kind and lists the subscriptions
 *       that need a person, by id — never by email.
 *
 *   npm run reconcile:billing -- --email=someone@example.com
 *   npm run reconcile:billing -- --subscription=<ProductSubscription id>
 *       Full diagnosis of one subject: what they bought, what state billing is
 *       in, whether they are entitled, which provider events landed, and every
 *       anomaly with the reason reconciliation is required.
 *
 * The email is a lookup key only. It is never printed, never stored in the
 * report, and provider correlation ids come back masked — the output is meant
 * to be safe to paste into a ticket.
 *
 * A repair, if one is needed, is a separate deliberate command:
 * `npm run repair:billing`. See docs/BILLING_RECONCILIATION.md.
 */
import { prisma } from "../lib/prisma";
import {
  diagnose,
  summarizeEventOutcomes,
  type ReconcilableEvent,
  type ReconcilableSubscription,
  type ReconciliationReport,
} from "../lib/billing/reconciliation";

const EVENT_WINDOW_DAYS = 30;
const EVENT_LIMIT = 500;

function arg(name: string): string | null {
  const hit = process.argv.find((value) => value.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).trim() : null;
}

/** Every field diagnosis reads, and nothing else — no email, no name. */
const SUBSCRIPTION_SELECT = {
  id: true,
  contactId: true,
  productKey: true,
  status: true,
  plan: true,
  offerKey: true,
  paymentProvider: true,
  adminOverride: true,
  providerCustomerId: true,
  providerSubscriptionId: true,
  providerProductId: true,
  trialEndsAt: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  pastDueAt: true,
  cancelAtPeriodEnd: true,
  billingStateUpdatedAt: true,
  emailDeliveryStatus: true,
  updatedAt: true,
} as const;

const EVENT_SELECT = {
  providerEventId: true,
  provider: true,
  type: true,
  outcome: true,
  processedAt: true,
  createdAt: true,
  payload: true,
} as const;

type StoredEvent = {
  providerEventId: string;
  provider: string;
  type: string;
  outcome: string | null;
  processedAt: Date | null;
  createdAt: Date;
  payload: unknown;
};

/**
 * Correlates stored events to one subscription.
 *
 * BillingEvent has no foreign key to ProductSubscription — by design, since an
 * event may arrive before any local row exists — so correlation is by provider
 * id appearing anywhere in the stored payload. That is deliberately generous:
 * an event that mentions this subscriber's customer id but resolved to
 * `no_subscription` is exactly the case worth surfacing, because it means money
 * moved for a person we failed to match.
 */
function correlate(
  events: readonly StoredEvent[],
  sub: ReconcilableSubscription,
): ReconcilableEvent[] {
  const needles = [sub.providerSubscriptionId, sub.providerCustomerId, sub.contactId].filter(
    (value): value is string => Boolean(value),
  );
  if (needles.length === 0) return [];

  const out: ReconcilableEvent[] = [];
  for (const event of events) {
    const body = JSON.stringify(event.payload ?? {});
    if (!needles.some((needle) => body.includes(needle))) continue;
    out.push({
      providerEventId: event.providerEventId,
      provider: event.provider,
      type: event.type,
      outcome: event.outcome,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
      subscriptionId: event.outcome === "no_subscription" ? null : sub.id,
      providerSubscriptionId: sub.providerSubscriptionId,
    });
  }
  return out;
}

async function recentEvents(): Promise<StoredEvent[]> {
  const since = new Date(Date.now() - EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return (await prisma.billingEvent.findMany({
    where: { createdAt: { gte: since } },
    select: EVENT_SELECT,
    orderBy: { createdAt: "desc" },
    take: EVENT_LIMIT,
  })) as StoredEvent[];
}

function printReport(report: ReconciliationReport): void {
  console.log(JSON.stringify(report, null, 2));
  console.log("");
  if (!report.reconciliationRequired) {
    console.log("No reconciliation required for this subscription.");
    return;
  }
  console.log(`Reconciliation required: ${report.requiredReason}`);
  for (const anomaly of report.anomalies) {
    console.log(`  [${anomaly.severity}] ${anomaly.code}: ${anomaly.summary}`);
  }
  if (report.recommendedAction) {
    console.log("");
    console.log(`Suggested next step: ${report.recommendedAction}`);
    if (report.recommendedAction !== "manual_provider_investigation") {
      console.log(
        `  npm run repair:billing -- --subscription=${report.subscriptionId} ` +
          `--action=${report.recommendedAction} --reason="..."`,
      );
      console.log("  (that command is a dry run until you add --apply)");
    }
  }
}

async function subjectMode(where: { email: string | null; subscriptionId: string | null }) {
  const subscriptions = (await prisma.productSubscription.findMany({
    where: where.subscriptionId
      ? { id: where.subscriptionId }
      : { contact: { email: where.email! } },
    select: SUBSCRIPTION_SELECT,
    orderBy: { createdAt: "asc" },
  })) as ReconcilableSubscription[];

  if (subscriptions.length === 0) {
    console.log("No subscription found for that identity.");
    process.exitCode = 1;
    return;
  }

  const events = await recentEvents();
  let required = 0;

  for (const sub of subscriptions) {
    const report = diagnose({ subscription: sub, events: correlate(events, sub) });
    if (report.reconciliationRequired) required += 1;
    console.log(`\n=== ${sub.productKey} (${sub.id}) ===`);
    printReport(report);
  }

  if (required > 0) process.exitCode = 1;
}

async function fleetMode() {
  const [subscriptions, events] = await Promise.all([
    prisma.productSubscription.findMany({
      select: SUBSCRIPTION_SELECT,
      orderBy: { createdAt: "asc" },
    }) as Promise<ReconcilableSubscription[]>,
    recentEvents(),
  ]);

  const byCode: Record<string, number> = {};
  const needing: { id: string; productKey: string; reason: string | null }[] = [];

  for (const sub of subscriptions) {
    const report = diagnose({ subscription: sub, events: correlate(events, sub) });
    for (const anomaly of report.anomalies) {
      byCode[anomaly.code] = (byCode[anomaly.code] ?? 0) + 1;
    }
    if (report.reconciliationRequired) {
      needing.push({
        id: report.subscriptionId,
        productKey: report.productKey,
        reason: report.requiredReason,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        subscriptions: subscriptions.length,
        eventWindowDays: EVENT_WINDOW_DAYS,
        events: summarizeEventOutcomes(events),
        anomaliesByCode: byCode,
        needingReconciliation: needing.length,
      },
      null,
      2,
    ),
  );

  if (needing.length === 0) {
    console.log("\nNothing needs reconciliation.");
    return;
  }

  console.log(`\n${needing.length} subscription(s) need a person:`);
  for (const entry of needing) {
    console.log(`  ${entry.id}  ${entry.productKey}  ${entry.reason}`);
  }
  console.log("\nDiagnose one with:");
  console.log("  npm run reconcile:billing -- --subscription=<id>");
  process.exitCode = 1;
}

async function main() {
  const email = arg("email");
  const subscriptionId = arg("subscription");

  if (email || subscriptionId) {
    await subjectMode({ email, subscriptionId });
    return;
  }
  await fleetMode();
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
