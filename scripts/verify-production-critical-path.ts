/** Read-only, single-identity production smoke assertion. Never prints email or provider ids. */
import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";
import { isOfferKey, OFFERS, type OfferKey } from "../lib/products/registry";
import { resolveEntitlements } from "../lib/products/entitlements";

const email = process.env.SMOKE_TEST_EMAIL?.trim().toLowerCase();
const offer = process.env.SMOKE_EXPECTED_OFFER;
if (!email || !isOfferKey(offer)) {
  throw new Error("Set SMOKE_TEST_EMAIL and SMOKE_EXPECTED_OFFER (one-article|one-news|one-read).");
}
const controlledEmail = email;
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
  console.log(JSON.stringify({
    identity: createHash("sha256").update(controlledEmail).digest("hex").slice(0, 12),
    offer: expectedOffer, billingStatus: row.status, paymentProvider: row.paymentProvider,
    billingStateUpdatedAt: row.billingStateUpdatedAt.toISOString(),
    entitlements: Object.fromEntries(Object.entries(entitlements.byProduct).map(([key, value]) => [key, value.granted])),
    deliveries: deliveries.map((delivery) => ({ status: delivery.status, providerStatus: delivery.providerStatus })),
    result: "PASS",
  }, null, 2));
}

main().catch((error) => { console.error(`FAIL: ${error instanceof Error ? error.message : "unknown"}`); process.exitCode = 1; }).finally(() => prisma.$disconnect());
