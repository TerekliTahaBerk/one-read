import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

const subscriptionsList = vi.fn();
const customersList = vi.fn();
vi.mock("@/lib/billing/polar", () => ({
  getPolarClient: () => ({
    subscriptions: { list: subscriptionsList },
    customers: { list: customersList },
  }),
  getPolarProductId: () => "one_read_product",
  mapPolarSubscriptionStatus: (status: string) =>
    status === "active"
      ? "ACTIVE_PAID"
      : status === "trialing"
        ? "TRIALING"
        : status === "past_due" || status === "unpaid"
          ? "PAST_DUE"
          : status === "canceled"
            ? "CANCELED"
            : "PENDING_CHECKOUT",
}));

import { prisma as prismaImport } from "@/lib/prisma";
import { reconcileOneReadBillingFromPolar } from "@/lib/oneread/billing-sync";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;
const originalToken = process.env.POLAR_ACCESS_TOKEN;
const originalProduct = process.env.POLAR_ONEREAD_PRODUCT_ID;

function pages(items: any[]) {
  return {
    async *[Symbol.asyncIterator]() {
      yield { result: { items } };
    },
  };
}

const localSubscription = {
  id: "local_sub_1",
  contactId: "contact_1",
  productKey: "one-read",
  status: "PENDING_CHECKOUT",
  plan: null,
  paidAt: null,
  trialUsedAt: null,
  pastDueAt: null,
};

const polarSubscription = {
  id: "polar_sub_1",
  status: "active",
  productId: "one_read_product",
  customerId: "polar_customer_1",
  checkoutId: "checkout_1",
  recurringInterval: "month",
  currentPeriodStart: new Date("2026-07-01T00:00:00.000Z"),
  currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
  trialStart: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  canceledAt: null,
  startedAt: new Date("2026-07-01T00:00:00.000Z"),
};

beforeEach(() => {
  mockReset(prisma);
  subscriptionsList.mockReset();
  customersList.mockReset();
  process.env.POLAR_ACCESS_TOKEN = "token_test";
  process.env.POLAR_ONEREAD_PRODUCT_ID = "one_read_product";
  prisma.contact.findUnique.mockResolvedValue({ id: "contact_1" } as any);
  prisma.productSubscription.findUnique.mockResolvedValue(localSubscription as any);
  prisma.productSubscription.update.mockImplementation(async ({ data }) => ({
    ...localSubscription,
    ...data,
  }) as any);
});

afterEach(() => {
  process.env.POLAR_ACCESS_TOKEN = originalToken;
  process.env.POLAR_ONEREAD_PRODUCT_ID = originalProduct;
  vi.clearAllMocks();
});

describe("reconcileOneReadBillingFromPolar", () => {
  it("activates the local row from a matching external-customer subscription", async () => {
    subscriptionsList.mockResolvedValueOnce(pages([polarSubscription]));

    const result = await reconcileOneReadBillingFromPolar("paid@example.com");

    expect(result?.status).toBe("ACTIVE_PAID");
    expect(prisma.productSubscription.update).toHaveBeenCalledWith({
      where: { id: "local_sub_1" },
      data: expect.objectContaining({
        status: "ACTIVE_PAID",
        paymentProvider: "polar",
        providerCustomerId: "polar_customer_1",
        providerSubscriptionId: "polar_sub_1",
        plan: "monthly",
      }),
    });
    expect(customersList).not.toHaveBeenCalled();
  });

  it("falls back to exact verified email for older Polar customers", async () => {
    subscriptionsList
      .mockResolvedValueOnce(pages([]))
      .mockResolvedValueOnce(pages([polarSubscription]));
    customersList.mockResolvedValueOnce(
      pages([{ id: "polar_customer_1", email: "paid@example.com" }]),
    );

    await reconcileOneReadBillingFromPolar("paid@example.com");

    expect(customersList).toHaveBeenCalledWith({ email: "paid@example.com", limit: 100 });
    expect(subscriptionsList).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customerId: ["polar_customer_1"],
        productId: "one_read_product",
      }),
    );
    expect(prisma.productSubscription.update).toHaveBeenCalledTimes(1);
  });

  it("does nothing when Polar has no matching OneRead subscription", async () => {
    subscriptionsList.mockResolvedValueOnce(pages([]));
    customersList.mockResolvedValueOnce(pages([]));

    await expect(reconcileOneReadBillingFromPolar("free@example.com")).resolves.toBeNull();
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("fails closed without billing configuration", async () => {
    delete process.env.POLAR_ACCESS_TOKEN;

    await expect(reconcileOneReadBillingFromPolar("paid@example.com")).resolves.toBeNull();
    expect(subscriptionsList).not.toHaveBeenCalled();
    expect(prisma.contact.findUnique).not.toHaveBeenCalled();
  });
});
