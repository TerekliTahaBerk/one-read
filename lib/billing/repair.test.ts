/**
 * Billing repair guarantees.
 *
 * These tests are about what a repair must *refuse* to do. A repair runs
 * against production data with a person's hand on it, so the failure modes that
 * matter are: writing when the operator only asked to look, overwriting state a
 * webhook wrote a second earlier, re-pointing a live provider correlation, and
 * doing any of it without leaving a trace.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { repairSubscription, isRepairAction, type RepairRequest } from "@/lib/billing/repair";
import { prisma as prismaImport } from "@/lib/prisma";
import {
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

const NOW = new Date("2026-06-16T12:00:00Z");
const PAST = new Date("2026-06-01T12:00:00Z");
const FUTURE = new Date("2026-07-16T12:00:00Z");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1",
    contactId: "contact_1",
    productKey: "one-article",
    status: "ACTIVE_PAID",
    plan: "monthly",
    offerKey: "one-article",
    paymentProvider: "polar",
    adminOverride: false,
    providerCustomerId: "polar_customer_abcdef123",
    providerSubscriptionId: "polar_sub_abcdef123",
    providerProductId: testProductId("one-article", "monthly"),
    providerCheckoutSessionId: null,
    providerCheckoutUrl: null,
    providerCheckoutExpiresAt: null,
    trialEndsAt: null,
    currentPeriodStart: PAST,
    currentPeriodEnd: FUTURE,
    pastDueAt: null,
    canceledAt: null,
    cancelAtPeriodEnd: false,
    billingStateUpdatedAt: PAST,
    emailDeliveryStatus: "SUBSCRIBED",
    updatedAt: PAST,
    ...overrides,
  };
}

function request(overrides: Partial<RepairRequest> = {}): RepairRequest {
  return {
    action: "apply_provider_snapshot",
    subscriptionId: "sub_1",
    actor: "operator:test",
    reason: "verifying reconciliation",
    now: NOW,
    ...overrides,
  };
}

const snapshot = (overrides: Record<string, unknown> = {}) => ({
  status: "canceled",
  productId: testProductId("one-article", "monthly"),
  currentPeriodEnd: FUTURE,
  cancelAtPeriodEnd: true,
  observedAt: NOW,
  ...overrides,
});

beforeEach(() => {
  mockReset(prisma);
  configureAllOffers();
  prisma.productSubscription.updateMany.mockResolvedValue({ count: 1 } as never);
  prisma.billingEvent.create.mockResolvedValue({} as never);
});

afterEach(() => {
  clearOfferEnv();
  vi.clearAllMocks();
});

describe("isRepairAction", () => {
  it("accepts only published action names", () => {
    expect(isRepairAction("apply_provider_snapshot")).toBe(true);
    expect(isRepairAction("grant_access")).toBe(false);
  });
});

describe("dry run is the default", () => {
  it("writes nothing and still returns the exact plan", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({ provider: snapshot() as never }),
    );

    expect(result.dryRun).toBe(true);
    expect(result.outcome).toBe("applied");
    expect(result.plan?.after).toMatchObject({ status: "CANCELED", cancelAtPeriodEnd: true });
    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
  });

  it("applies the same plan when the operator opts out of dry run", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({ provider: snapshot() as never, dryRun: false }),
    );

    expect(result.outcome).toBe("applied");
    expect(prisma.productSubscription.updateMany).toHaveBeenCalledTimes(1);
    const call = prisma.productSubscription.updateMany.mock.calls[0][0] as never as {
      data: Record<string, unknown>;
    };
    expect(call.data).toMatchObject({ status: "CANCELED", billingStateUpdatedAt: NOW });
  });
});

describe("apply_provider_snapshot", () => {
  it("refuses without a snapshot", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(request({ dryRun: false }));

    expect(result.outcome).toBe("refused");
    expect(result.refusal).toBe("provider_snapshot_required");
    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a provider status it does not model rather than defaulting", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({ provider: snapshot({ status: "paused" }) as never, dryRun: false }),
    );

    expect(result.refusal).toBe("unmodelled_provider_status");
    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a snapshot older than the state already stored", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(
      row({ billingStateUpdatedAt: NOW }) as never,
    );

    const result = await repairSubscription(
      request({ provider: snapshot({ observedAt: PAST }) as never, dryRun: false }),
    );

    expect(result.refusal).toBe("stale_provider_snapshot");
    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("is idempotent when local state already matches the provider", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({
        provider: snapshot({ status: "active", cancelAtPeriodEnd: false }) as never,
        dryRun: false,
      }),
    );

    expect(result.outcome).toBe("no_change");
    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
  });

  it("gates the write on the provider clock so a concurrent webhook wins", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);
    prisma.productSubscription.updateMany.mockResolvedValue({ count: 0 } as never);

    const result = await repairSubscription(
      request({ provider: snapshot() as never, dryRun: false }),
    );

    expect(result.outcome).toBe("refused");
    expect(result.refusal).toBe("lost_to_newer_state");
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();

    const where = (
      prisma.productSubscription.updateMany.mock.calls[0][0] as never as {
        where: { OR?: unknown[] };
      }
    ).where;
    expect(where.OR).toBeDefined();
  });

  it("stamps the past-due moment on entry and clears it on recovery", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(
      row({ status: "PAST_DUE", pastDueAt: PAST }) as never,
    );

    const recovered = await repairSubscription(
      request({
        provider: snapshot({ status: "active", cancelAtPeriodEnd: false }) as never,
        dryRun: false,
      }),
    );

    expect(recovered.outcome).toBe("applied");
    const data = (
      prisma.productSubscription.updateMany.mock.calls[0][0] as never as {
        data: Record<string, unknown>;
      }
    ).data;
    expect(data.pastDueAt).toBeNull();
  });
});

describe("link_provider_subscription", () => {
  it("fills an empty correlation slot", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(
      row({ providerSubscriptionId: null }) as never,
    );

    const result = await repairSubscription(
      request({
        action: "link_provider_subscription",
        providerSubscriptionId: "polar_sub_newvalue",
        dryRun: false,
      }),
    );

    expect(result.outcome).toBe("applied");
    expect(
      (prisma.productSubscription.updateMany.mock.calls[0][0] as never as {
        data: Record<string, unknown>;
      }).data,
    ).toMatchObject({ providerSubscriptionId: "polar_sub_newvalue" });
  });

  it("refuses to re-point a correlation that is already set", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({
        action: "link_provider_subscription",
        providerSubscriptionId: "polar_sub_other",
        dryRun: false,
      }),
    );

    expect(result.refusal).toBe("precondition_failed");
    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
  });

  it("is a no-op when the same id is linked again", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({
        action: "link_provider_subscription",
        providerSubscriptionId: "polar_sub_abcdef123",
        dryRun: false,
      }),
    );

    expect(result.outcome).toBe("no_change");
  });
});

describe("classify_offer", () => {
  it("records the offer once provider evidence identifies it", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(
      row({ productKey: "one-read", offerKey: null, providerProductId: null }) as never,
    );

    const result = await repairSubscription(
      request({
        action: "classify_offer",
        provider: snapshot({ productId: testProductId("one-read", "monthly") }) as never,
        dryRun: false,
      }),
    );

    expect(result.outcome).toBe("applied");
    expect(
      (prisma.productSubscription.updateMany.mock.calls[0][0] as never as {
        data: Record<string, unknown>;
      }).data,
    ).toMatchObject({ offerKey: "one-read" });
  });

  it("refuses a product id that is not one of ours", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(
      row({ offerKey: null, providerProductId: null }) as never,
    );

    const result = await repairSubscription(
      request({
        action: "classify_offer",
        provider: snapshot({ productId: "prod_someone_elses" }) as never,
        dryRun: false,
      }),
    );

    expect(result.refusal).toBe("precondition_failed");
  });

  it("will not weaken a classification that is already exact", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({ action: "classify_offer", dryRun: false }),
    );

    expect(result.outcome).toBe("no_change");
  });
});

describe("clear_stale_checkout", () => {
  it("refuses while the session can still be resumed", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(
      row({
        providerCheckoutSessionId: "checkout_1",
        providerCheckoutExpiresAt: FUTURE,
      }) as never,
    );

    const result = await repairSubscription(
      request({ action: "clear_stale_checkout", dryRun: false }),
    );

    expect(result.refusal).toBe("precondition_failed");
  });

  it("clears an expired session", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(
      row({ providerCheckoutSessionId: "checkout_1", providerCheckoutExpiresAt: PAST }) as never,
    );

    const result = await repairSubscription(
      request({ action: "clear_stale_checkout", dryRun: false }),
    );

    expect(result.outcome).toBe("applied");
  });
});

describe("audit trail", () => {
  it("records the actor, reason and field-level change, and no email", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(row() as never);

    const result = await repairSubscription(
      request({ provider: snapshot() as never, dryRun: false }),
    );

    expect(prisma.billingEvent.create).toHaveBeenCalledTimes(1);
    const created = (prisma.billingEvent.create.mock.calls[0][0] as never as {
      data: { provider: string; type: string; payload: Record<string, unknown> };
    }).data;

    expect(created.provider).toBe("operator");
    expect(created.type).toBe("repair.apply_provider_snapshot");
    expect(created.payload).toMatchObject({
      actor: "operator:test",
      reason: "verifying reconciliation",
    });
    expect(JSON.stringify(created.payload)).not.toContain("@");
    expect(result.auditId).toContain("repair");
  });

  it("refuses cleanly when the subscription does not exist", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(null as never);

    const result = await repairSubscription(request({ dryRun: false }));

    expect(result.refusal).toBe("no_subscription");
    expect(prisma.billingEvent.create).not.toHaveBeenCalled();
  });
});
