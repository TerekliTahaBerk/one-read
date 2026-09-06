/** Read-only, single-identity production smoke assertion. Never prints email or provider ids. */
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { isOfferKey, OFFERS, type OfferKey } from "../lib/products/registry";
import { resolveEntitlements } from "../lib/products/entitlements";
import { diagnose, type ReconcilableEvent } from "../lib/billing/reconciliation";

const email = process.env.SMOKE_TEST_EMAIL?.trim().toLowerCase();
const offer = process.env.SMOKE_EXPECTED_OFFER;
if (!email || !isOfferKey(offer)) {
  throw new Error("Set SMOKE_TEST_EMAIL and SMOKE_EXPECTED_OFFER (one-article|one-news|one-read).");
}
const controlledEmail = email;
/** How far back to look for the provider events behind the current state. */
const EVENT_WINDOW_DAYS = 30;
const EVENT_LIMIT = 500;
const expectedOffer = offer;

async function main() {
  const contact = await prisma.contact.findUnique({
    where: { email: controlledEmail },
    include: { subscriptions: { include: { preferences: true } }, oneArticleDeliveries: true, oneNewsDeliveries: true },
  });
  if (!contact) throw new Error("controlled_identity_not_found");
  const billing = contact.subscriptions.filter((row) => row.offerKey === expectedOffer);
  if (billing.length !== 1) throw new Error(`expected_one_billing_row_observed_${billing.length}`);
  const row = billing[0]!;
  if (row.status !== "ACTIVE_PAID" || row.paymentProvider !== "polar") throw new Error("billing_entitlement_not_active");
  if (!row.providerCustomerId || !row.providerSubscriptionId || !row.providerProductId) throw new Error("provider_identity_incomplete");
  if (!row.billingStateUpdatedAt) throw new Error("billing_state_timestamp_missing");
  const entitlements = resolveEntitlements(contact.subscriptions);
  for (const product of OFFERS[expectedOffer as OfferKey].grants) {
    if (!entitlements.byProduct[product].granted) throw new Error(`missing_${product}_entitlement`);
  }
  const deliveries = [...contact.oneArticleDeliveries, ...contact.oneNewsDeliveries];
  const duplicate = new Set<string>();
  for (const delivery of deliveries) {
    const key = `${"issueId" in delivery ? delivery.issueId : ""}:${delivery.contactId}`;
    if (duplicate.has(key)) throw new Error("duplicate_delivery_detected");
    duplicate.add(key);
  }
  if (deliveries.some((delivery) => delivery.status === "RECONCILIATION_REQUIRED")) throw new Error("reconciliation_required");

  // Provider event -> local state. The assertions above prove the row *looks*
  // paid; these prove a signed provider event is what made it so. A row that
  // reads ACTIVE_PAID with no applied event behind it is the exact shape of a
  // manual edit or a repair that was never re-confirmed by the provider, which
  // is the thing this gate exists to refuse.
  const events = (await prisma.billingEvent.findMany({
    where: { createdAt: { gte: new Date(Date.now() - EVENT_WINDOW_DAYS * 86_400_000) } },
    select: { providerEventId: true, provider: true, type: true, outcome: true, processedAt: true, createdAt: true, payload: true },
    orderBy: { createdAt: "desc" },
    take: EVENT_LIMIT,
  })) as { providerEventId: string; provider: string; type: string; outcome: string | null; processedAt: Date | null; createdAt: Date; payload: unknown }[];

  // No foreign key exists by design — an event can arrive before the row does —
  // so correlation is by provider id appearing in the stored payload.
  const needles = [row.providerSubscriptionId, row.providerCustomerId, row.contactId].filter((value): value is string => Boolean(value));
  const correlated: ReconcilableEvent[] = events
    .filter((event) => needles.some((needle) => JSON.stringify(event.payload ?? {}).includes(needle)))
    .map((event) => ({
      providerEventId: event.providerEventId,
      provider: event.provider,
      type: event.type,
      outcome: event.outcome,
      processedAt: event.processedAt,
      createdAt: event.createdAt,
      subscriptionId: event.outcome === "no_subscription" ? null : row.id,
      providerSubscriptionId: row.providerSubscriptionId,
    }));

  const report = diagnose({ subscription: row, events: correlated });
  if (report.events.applied < 1) throw new Error("no_applied_provider_event_behind_paid_state");
  if (report.events.unmatched > 0) throw new Error("provider_event_matched_no_subscriber");
  if (report.events.unrecognizedProduct > 0) throw new Error("provider_event_carried_unrecognized_product");
  if (report.reconciliationRequired) throw new Error(`reconciliation_required_${report.requiredReason}`);
  if (!report.entitlement.entitled) throw new Error("diagnosis_reports_no_entitlement");
  console.log(JSON.stringify({
    identity: createHash("sha256").update(controlledEmail).digest("hex").slice(0, 12),
    offer: expectedOffer, billingStatus: row.status, paymentProvider: row.paymentProvider,
    billingStateUpdatedAt: row.billingStateUpdatedAt.toISOString(),
    entitlements: Object.fromEntries(Object.entries(entitlements.byProduct).map(([key, value]) => [key, value.granted])),
    deliveries: deliveries.map((delivery) => ({ status: delivery.status, providerStatus: delivery.providerStatus })),
    providerEvents: {
      considered: report.events.considered,
      applied: report.events.applied,
      ignoredStale: report.events.ignoredStale,
      latestType: report.events.latestType,
      latestOutcome: report.events.latestOutcome,
    },
    entitlementState: report.entitlement.state,
    result: "PASS",
  }, null, 2));
}

main().catch((error) => { console.error(`FAIL: ${error instanceof Error ? error.message : "unknown"}`); process.exitCode = 1; }).finally(() => prisma.$disconnect());
