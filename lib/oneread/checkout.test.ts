import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock("@/lib/oneread/access", () => ({
  ensureOneReadSubscription: vi.fn(),
}));
vi.mock("@/lib/oneread/billing-sync", () => ({
  reconcileOneReadBillingFromPolar: vi.fn(),
}));
vi.mock("@/lib/billing/polar", () => ({
  createPolarCheckoutForSubscription: vi.fn(),
  createPolarCustomerPortalUrl: vi.fn(),
}));

import { prisma as prismaImport } from "@/lib/prisma";
import { ensureOneReadSubscription } from "@/lib/oneread/access";
import { reconcileOneReadBillingFromPolar } from "@/lib/oneread/billing-sync";
import { createPolarCheckoutForSubscription } from "@/lib/billing/polar";
import { createOneReadCheckoutSession } from "@/lib/oneread/checkout";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;
const ensureOneRead = vi.mocked(ensureOneReadSubscription);
const reconcile = vi.mocked(reconcileOneReadBillingFromPolar);
const createCheckout = vi.mocked(createPolarCheckoutForSubscription);

const baseSubscription = {
  id: "one_read_1",
  contactId: "contact_1",
  productKey: "one-read",
  status: "PENDING_CHECKOUT",
  paymentProvider: null,
  providerCustomerId: null,
  providerSubscriptionId: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  pastDueAt: null,
  adminOverride: false,
};

const articleHolder = {
  preferences: { summaryLanguage: "English", interests: ["Finance"] },
};
function mockCheckoutReads(subscription: Record<string, unknown>) {
  prisma.productSubscription.findUnique
    .mockResolvedValueOnce(subscription as any)
    .mockResolvedValueOnce(articleHolder as any);
}

beforeEach(() => {
  mockReset(prisma);
  vi.resetAllMocks();
  ensureOneRead.mockResolvedValue(baseSubscription as any);
  reconcile.mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createOneReadCheckoutSession", () => {
  it("never creates a checkout for an admin-comped premium user", async () => {
    mockCheckoutReads({
      ...baseSubscription,
      status: "ADMIN_OVERRIDE",
      adminOverride: true,
    });

    await expect(createOneReadCheckoutSession("premium@example.com")).resolves.toEqual({
      kind: "already_active",
      billingManageable: false,
    });
    expect(reconcile).toHaveBeenCalledWith("premium@example.com");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("never creates a duplicate checkout after Polar reconciliation activates access", async () => {
    mockCheckoutReads({
      ...baseSubscription,
      status: "ACTIVE_PAID",
      paymentProvider: "polar",
      providerSubscriptionId: "polar_sub_1",
    });

    await expect(createOneReadCheckoutSession("paid@example.com")).resolves.toEqual({
      kind: "already_active",
      billingManageable: true,
    });
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("creates checkout only when preferences are complete and access is not valid", async () => {
    mockCheckoutReads(baseSubscription);
    createCheckout.mockResolvedValue("https://checkout.example.test");

    await expect(createOneReadCheckoutSession("new@example.com")).resolves.toEqual({
      kind: "redirect",
      url: "https://checkout.example.test",
    });
    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ id: "one_read_1" }),
      "new@example.com",
      "one-read",
    );
  });
});
