/**
 * Milestone C2 Polar webhook matrix.
 *
 * Exercises the real handler (`applyPolarWebhookPayload`) against fixture
 * payloads — no network, no credentials. Every case is a delivery Polar can
 * actually make, including the ones that arrive twice, out of order, or
 * carrying a product we have never heard of.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { applyPolarWebhookPayload } from "@/lib/billing/polar";
import { prisma as prismaImport } from "@/lib/prisma";
import {
  LEGACY_ONEREAD_PRODUCT_ID,
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

const T0 = new Date("2026-06-01T00:00:00Z");
const T1 = new Date("2026-06-02T00:00:00Z");

beforeEach(() => {
  mockReset(prisma);
  configureAllOffers();
  prisma.subscriptionTransition.findMany.mockResolvedValue([]);
});

afterEach(() => {
  clearOfferEnv();
  vi.clearAllMocks();
});

function existingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    contactId: "contact_1",
    productKey: "one-read",
    status: "PENDING_CHECKOUT",
    plan: null,
    offerKey: null,
    providerProductId: null,
    providerSubscriptionId: null,
    paidAt: null,
    trialUsedAt: null,
    billingStateUpdatedAt: null,
    ...overrides,
  };
}

/** Route every lookup to one row, as a live contact with one subscription. */
function withRow(row: Record<string, unknown>) {
  prisma.productSubscription.findUnique.mockResolvedValue(row as never);
  prisma.productSubscription.findFirst.mockResolvedValue(row as never);
}

function lastUpdateData(): Record<string, any> {
  const calls = prisma.productSubscription.update.mock.calls;
  return (calls[calls.length - 1]![0] as any).data;
}

function subscriptionEvent(args: {
  productId: string;
  type?: string;
  status?: string;
  interval?: string;
  timestamp?: Date;
  extra?: Record<string, unknown>;
}) {
  return {
    type: args.type ?? "subscription.active",
    timestamp: args.timestamp ?? T0,
    data: {
      id: "polar_sub_1",
      productId: args.productId,
      status: args.status ?? "active",
      recurringInterval: args.interval ?? "month",
      customerId: "polar_cus_1",
      metadata: { productSubscriptionId: "sub_1", contactId: "contact_1" },
      currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
      ...args.extra,
    },
  };
}

/* ------------------------- the six current offers ------------------------- */

const OFFER_CASES = [
  ["one-article", "monthly", "month"],
  ["one-article", "annual", "year"],
  ["one-news", "monthly", "month"],
  ["one-news", "annual", "year"],
  ["one-read", "monthly", "month"],
  ["one-read", "annual", "year"],
] as const;

describe.each(OFFER_CASES)("%s %s lifecycle", (offer, interval, providerInterval) => {
  const productId = testProductId(offer, interval);

  beforeEach(() => withRow(existingRow({ productKey: offer })));

  it("activation records offer identity, interval and ACTIVE_PAID", async () => {
    const result = await applyPolarWebhookPayload(
      subscriptionEvent({ productId, interval: providerInterval }),
    );

    expect(result.outcome).toBe("applied");
    expect(lastUpdateData()).toMatchObject({
      status: "ACTIVE_PAID",
      offerKey: offer,
      providerProductId: productId,
      plan: interval,
      providerSubscriptionId: "polar_sub_1",
      paymentProvider: "polar",
    });
  });

  it("renewal keeps the subscription active and advances the period", async () => {
    const result = await applyPolarWebhookPayload(
      subscriptionEvent({
        productId,
        type: "subscription.updated",
        interval: providerInterval,
        timestamp: T1,
      }),
    );
    expect(result.outcome).toBe("applied");
    expect(lastUpdateData()).toMatchObject({
      status: "ACTIVE_PAID",
      billingStateUpdatedAt: T1,
    });
  });

  it("past due is recorded without destroying offer identity", async () => {
    const data = await applyPolarWebhookPayload(
      subscriptionEvent({
        productId,
        type: "subscription.past_due",
        status: "past_due",
        interval: providerInterval,
      }),
    ).then(lastUpdateData);

    expect(data).toMatchObject({ status: "PAST_DUE", offerKey: offer, pastDueAt: T0 });
  });

  it("cancellation is recorded as CANCELED with the period end intact", async () => {
    const data = await applyPolarWebhookPayload(
      subscriptionEvent({
        productId,
        type: "subscription.canceled",
        status: "canceled",
        interval: providerInterval,
        extra: { cancelAtPeriodEnd: true, canceledAt: T0 },
      }),
    ).then(lastUpdateData);

    expect(data).toMatchObject({
      status: "CANCELED",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
    });
  });
});

/* ------------------------------- safety ---------------------------------- */

describe("webhook safety", () => {
  it("a stale event cannot regress newer billing state", async () => {
    withRow(existingRow({ status: "ACTIVE_PAID", billingStateUpdatedAt: T1 }));

    const result = await applyPolarWebhookPayload(
      subscriptionEvent({
        productId: testProductId("one-read", "monthly"),
        type: "subscription.revoked",
        timestamp: T0,
      }),
    );

    expect(result.outcome).toBe("ignored_stale");
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("events arriving out of order settle on the newest, whichever lands last", async () => {
    withRow(existingRow({ status: "PENDING_CHECKOUT", billingStateUpdatedAt: null }));
    const productId = testProductId("one-news", "monthly");

    // Newer event first.
    await applyPolarWebhookPayload(subscriptionEvent({ productId, timestamp: T1 }));
    expect(lastUpdateData()).toMatchObject({ status: "ACTIVE_PAID", billingStateUpdatedAt: T1 });

    // The older delivery then arrives and must be refused.
    withRow(existingRow({ status: "ACTIVE_PAID", billingStateUpdatedAt: T1 }));
    const late = await applyPolarWebhookPayload(
      subscriptionEvent({ productId, type: "subscription.revoked", timestamp: T0 }),
    );
    expect(late.outcome).toBe("ignored_stale");
  });

  it("a redelivered identical event applies the same state (idempotent)", async () => {
    const productId = testProductId("one-article", "annual");
    withRow(existingRow({ productKey: "one-article" }));
    await applyPolarWebhookPayload(subscriptionEvent({ productId, interval: "year" }));
    const first = lastUpdateData();

    withRow(existingRow({ productKey: "one-article", billingStateUpdatedAt: T0 }));
    await applyPolarWebhookPayload(subscriptionEvent({ productId, interval: "year" }));
    const second = lastUpdateData();

    expect(second).toEqual(first);
  });

  it("an unknown provider product is never applied and never assumed to be the bundle", async () => {
    withRow(existingRow({ status: "ACTIVE_PAID" }));

    const result = await applyPolarWebhookPayload(
      subscriptionEvent({ productId: "prod_not_ours_at_all" }),
    );

    expect(result.outcome).toBe("unrecognized_product");
    expect(result.providerProductId).toBe("prod_not_ours_at_all");
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("missing metadata still reconciles via the recorded provider subscription id", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(null as never);
    prisma.productSubscription.findFirst.mockResolvedValue(
      existingRow({ productKey: "one-news", providerSubscriptionId: "polar_sub_1" }) as never,
    );

    const result = await applyPolarWebhookPayload({
      type: "subscription.active",
      timestamp: T0,
      data: {
        id: "polar_sub_1",
        productId: testProductId("one-news", "monthly"),
        status: "active",
        recurringInterval: "month",
      },
    });

    expect(result.outcome).toBe("applied");
    expect(lastUpdateData()).toMatchObject({ offerKey: "one-news" });
  });

  it("an unidentifiable event touches nothing", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(null as never);
    prisma.productSubscription.findFirst.mockResolvedValue(null as never);
    prisma.contact.findUnique.mockResolvedValue(null as never);

    const result = await applyPolarWebhookPayload({
      type: "checkout.updated",
      timestamp: T0,
      data: { id: "checkout_orphan" },
    });

    expect(result.outcome).toBe("no_subscription");
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("a legacy $1 webhook keeps the subscription legacy — it never becomes the bundle", async () => {
    withRow(existingRow({ productKey: "one-read", status: "ACTIVE_PAID" }));

    const result = await applyPolarWebhookPayload(
      subscriptionEvent({ productId: LEGACY_ONEREAD_PRODUCT_ID }),
    );

    expect(result.outcome).toBe("applied");
    expect(lastUpdateData()).toMatchObject({
      offerKey: "legacy-one-read-umbrella",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
    });
    expect(lastUpdateData().offerKey).not.toBe("one-read");
  });

  it("a newly-known provider product resolves a previously ambiguous row", async () => {
    // The row predates offer identity entirely.
    withRow(existingRow({ productKey: "one-read", status: "ACTIVE_PAID", offerKey: null }));

    await applyPolarWebhookPayload(
      subscriptionEvent({ productId: LEGACY_ONEREAD_PRODUCT_ID }),
    );

    expect(lastUpdateData()).toMatchObject({
      offerKey: "legacy-one-read-umbrella",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
    });
  });

  it("a later event carrying no product cannot erase established identity", async () => {
    const productId = testProductId("one-read", "monthly");
    withRow(
      existingRow({ status: "ACTIVE_PAID", offerKey: "one-read", providerProductId: productId }),
    );

    await applyPolarWebhookPayload({
      type: "checkout.updated",
      timestamp: T1,
      data: { id: "checkout_9", metadata: { productSubscriptionId: "sub_1" } },
    });

    const data = lastUpdateData();
    expect(data.offerKey).toBeUndefined();
    expect(data.providerProductId).toBeUndefined();
  });

  it("stamped metadata cannot move a row onto an offer the provider did not charge for", async () => {
    withRow(existingRow({ productKey: "one-article", status: "ACTIVE_PAID" }));

    // Metadata claims the bundle; Polar says the OneArticle product. Polar wins.
    const result = await applyPolarWebhookPayload({
      type: "subscription.active",
      timestamp: T0,
      data: {
        id: "polar_sub_1",
        productId: testProductId("one-article", "monthly"),
        status: "active",
        recurringInterval: "month",
        metadata: { productSubscriptionId: "sub_1", offerKey: "one-read" },
      },
    });

    expect(result.outcome).toBe("applied");
    expect(lastUpdateData().offerKey).toBe("one-article");
  });

  it("a second product for the same contact resolves to its own row", async () => {
    // Metadata points at the OneNews row; the contact already owns OneArticle.
    const newsRow = existingRow({ id: "sub_news", productKey: "one-news" });
    prisma.productSubscription.findUnique.mockResolvedValue(newsRow as never);

    await applyPolarWebhookPayload({
      type: "subscription.active",
      timestamp: T0,
      data: {
        id: "polar_sub_news",
        productId: testProductId("one-news", "monthly"),
        status: "active",
        recurringInterval: "month",
        metadata: { productSubscriptionId: "sub_news", contactId: "contact_1" },
      },
    });

    const call = prisma.productSubscription.update.mock.calls.at(-1)![0] as any;
    expect(call.where).toEqual({ id: "sub_news" });
    expect(call.data.offerKey).toBe("one-news");
    expect(prisma.contact.create).not.toHaveBeenCalled();
  });

  it("ignores non-billing event types outright", async () => {
    const result = await applyPolarWebhookPayload({
      type: "benefit.created",
      timestamp: T0,
      data: { id: "benefit_1" },
    });
    expect(result.outcome).toBe("ignored_event_type");
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });
});
