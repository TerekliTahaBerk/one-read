import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock("@/lib/billing/polar", () => ({ createPolarCustomerPortalUrl: vi.fn() }));

import { prisma as prismaImport } from "@/lib/prisma";
import { createPolarCustomerPortalUrl } from "@/lib/billing/polar";
import { openBillingPortal } from "./users";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    contactId: "contact-1",
    productKey: "one-article",
    paymentProvider: "polar",
    providerCustomerId: "cus_1",
    providerSubscriptionId: "sub_polar_1",
    ...overrides,
  };
}

function found(sub: unknown) {
  (prisma.productSubscription.findUnique as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue(sub as never);
}

beforeEach(() => {
  mockReset(prisma);
  vi.mocked(createPolarCustomerPortalUrl).mockReset();
});

describe("openBillingPortal", () => {
  it("returns a portal session for a Polar-billed subscription", async () => {
    found(subscription());
    vi.mocked(createPolarCustomerPortalUrl).mockResolvedValue("https://polar.test/portal/abc");

    await expect(openBillingPortal("sub-1")).resolves.toEqual({
      ok: true,
      url: "https://polar.test/portal/abc",
    });
  });

  it("opens the portal for the given subscription, not any row on the contact", async () => {
    const sub = subscription({ productKey: "one-news" });
    found(sub);
    vi.mocked(createPolarCustomerPortalUrl).mockResolvedValue("https://polar.test/portal/xyz");

    await openBillingPortal("sub-1");
    expect(createPolarCustomerPortalUrl).toHaveBeenCalledWith(sub, "one-news");
  });

  it("refuses a subscription that is not billed through Polar", async () => {
    found(subscription({ paymentProvider: null }));
    await expect(openBillingPortal("sub-1")).resolves.toEqual({
      ok: false,
      error: "not_a_polar_subscription",
    });
    expect(createPolarCustomerPortalUrl).not.toHaveBeenCalled();
  });

  it("refuses a subscription with no billing account linked yet", async () => {
    found(subscription({ providerCustomerId: null, providerSubscriptionId: null }));
    await expect(openBillingPortal("sub-1")).resolves.toEqual({
      ok: false,
      error: "no_billing_account",
    });
    expect(createPolarCustomerPortalUrl).not.toHaveBeenCalled();
  });

  it("reports a missing subscription rather than throwing", async () => {
    found(null);
    await expect(openBillingPortal("nope")).resolves.toEqual({
      ok: false,
      error: "subscription_not_found",
    });
  });

  it("turns a provider outage into an operator-readable failure", async () => {
    found(subscription());
    vi.mocked(createPolarCustomerPortalUrl).mockRejectedValue(new Error("polar 503"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(openBillingPortal("sub-1")).resolves.toEqual({
      ok: false,
      error: "billing_portal_unavailable",
    });
  });
});
