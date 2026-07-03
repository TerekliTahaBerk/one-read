import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { applyPolarWebhookPayload, mapPolarSubscriptionStatus } from "@/lib/billing/polar";
import { prisma as prismaImport } from "@/lib/prisma";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prisma);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("mapPolarSubscriptionStatus", () => {
  it.each([
    ["trialing", "TRIALING"],
    ["active", "ACTIVE_PAID"],
    ["past_due", "PAST_DUE"],
    ["unpaid", "PAST_DUE"],
    ["canceled", "CANCELED"],
    ["incomplete_expired", "EXPIRED"],
    ["incomplete", "PENDING_CHECKOUT"],
    ["something_unknown", "PENDING_CHECKOUT"],
  ])("maps %s -> %s", (input, expected) => {
    expect(mapPolarSubscriptionStatus(input)).toBe(expected);
  });
});

describe("applyPolarWebhookPayload", () => {
  const baseSub = {
    id: "sub_1",
    contactId: "contact_1",
    plan: "monthly",
    paidAt: null,
    trialUsedAt: null,
  };

  function mockFoundSubscriptionByMetadataId() {
    prisma.productSubscription.findUnique.mockResolvedValue(baseSub as any);
  }

  it("order.paid with a subscriptionId sets status ACTIVE_PAID and paidAt", async () => {
    mockFoundSubscriptionByMetadataId();
    const timestamp = new Date("2026-01-01T00:00:00Z");

    await applyPolarWebhookPayload({
      type: "order.paid",
      timestamp,
      data: {
        metadata: { productSubscriptionId: "sub_1" },
        subscriptionId: "provider_sub_1",
      },
    });

    expect(prisma.productSubscription.update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: expect.objectContaining({
        status: "ACTIVE_PAID",
        paidAt: timestamp,
        providerSubscriptionId: "provider_sub_1",
      }),
    });
  });

  it("subscription.revoked always sets status EXPIRED regardless of data.status", async () => {
    mockFoundSubscriptionByMetadataId();

    await applyPolarWebhookPayload({
      type: "subscription.revoked",
      timestamp: new Date(),
      data: {
        id: "provider_sub_1",
        status: "active",
        metadata: { productSubscriptionId: "sub_1" },
      },
    });

    expect(prisma.productSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "EXPIRED" }),
      }),
    );
  });

  it("subscription.past_due sets status PAST_DUE and pastDueAt", async () => {
    mockFoundSubscriptionByMetadataId();
    const timestamp = new Date("2026-02-01T00:00:00Z");

    await applyPolarWebhookPayload({
      type: "subscription.past_due",
      timestamp,
      data: {
        id: "provider_sub_1",
        status: "past_due",
        metadata: { productSubscriptionId: "sub_1" },
      },
    });

    expect(prisma.productSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAST_DUE",
          pastDueAt: timestamp,
        }),
      }),
    );
  });

  it("generic subscription event maps status via mapPolarSubscriptionStatus", async () => {
    mockFoundSubscriptionByMetadataId();

    await applyPolarWebhookPayload({
      type: "subscription.updated",
      timestamp: new Date(),
      data: {
        id: "provider_sub_1",
        status: "trialing",
        metadata: { productSubscriptionId: "sub_1" },
      },
    });

    expect(prisma.productSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "TRIALING" }),
      }),
    );
  });

  it("unknown event type returns early and never calls update", async () => {
    await applyPolarWebhookPayload({
      type: "ping",
      timestamp: new Date(),
      data: {},
    });

    expect(prisma.productSubscription.findUnique).not.toHaveBeenCalled();
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("no matching subscription found: update is never called, no throw", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(null);
    prisma.productSubscription.findFirst.mockResolvedValue(null);
    prisma.contact.findUnique.mockResolvedValue(null);

    await expect(
      applyPolarWebhookPayload({
        type: "subscription.active",
        timestamp: new Date(),
        data: { id: "provider_sub_unknown", status: "active" },
      }),
    ).resolves.toBeUndefined();

    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("metadata productSubscriptionId lookup short-circuits providerSubscriptionId/contact/email fallbacks", async () => {
    mockFoundSubscriptionByMetadataId();

    await applyPolarWebhookPayload({
      type: "subscription.active",
      timestamp: new Date(),
      data: {
        id: "provider_sub_1",
        status: "active",
        metadata: { productSubscriptionId: "sub_1" },
      },
    });

    expect(prisma.productSubscription.findUnique).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      include: { preferences: true },
    });
    expect(prisma.productSubscription.findFirst).not.toHaveBeenCalled();
    expect(prisma.contact.findUnique).not.toHaveBeenCalled();
  });

  it("falls back to customer.metadata when data.metadata is absent", async () => {
    prisma.productSubscription.findUnique.mockResolvedValue(baseSub as any);

    await applyPolarWebhookPayload({
      type: "subscription.active",
      timestamp: new Date(),
      data: {
        id: "provider_sub_1",
        status: "active",
        customer: { metadata: { productSubscriptionId: "sub_1" } },
      },
    });

    expect(prisma.productSubscription.findUnique).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      include: { preferences: true },
    });
    expect(prisma.productSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "sub_1" } }),
    );
  });
});
