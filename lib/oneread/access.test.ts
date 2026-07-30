import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { prisma as prismaImport } from "@/lib/prisma";
import { resolveOneReadState } from "@/lib/oneread/access";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;
const now = new Date("2026-07-30T12:00:00.000Z");
const base = {
  id: "sub_1",
  contactId: "contact_1",
  productKey: "one-read",
  status: "PENDING_CHECKOUT",
  emailDeliveryStatus: "SUBSCRIBED",
  adminOverride: false,
  paymentProvider: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
};

function returnSubscription(subscription: Record<string, unknown> | null) {
  prisma.contact.findUnique.mockResolvedValue(
    subscription
      ? ({ id: "contact_1", subscriptions: [subscription] } as any)
      : null,
  );
}

beforeEach(() => {
  mockReset(prisma);
});

describe("resolveOneReadState", () => {
  it("distinguishes new, incomplete, and checkout-needed accounts", async () => {
    returnSubscription(null);
    await expect(resolveOneReadState("new@example.com", now)).resolves.toEqual({ state: "new" });

    returnSubscription({ ...base, status: "PENDING_PREFERENCES" });
    await expect(resolveOneReadState("incomplete@example.com", now)).resolves.toEqual({
      state: "incomplete",
    });

    returnSubscription(base);
    await expect(resolveOneReadState("checkout@example.com", now)).resolves.toEqual({
      state: "checkout_needed",
    });
  });

  it("does not trust ACTIVE_PAID without provider confirmation", async () => {
    returnSubscription({ ...base, status: "ACTIVE_PAID" });
    await expect(resolveOneReadState("unsafe@example.com", now)).resolves.toEqual({
      state: "checkout_needed",
    });
  });

  it("recognizes paid and admin-comped premium access", async () => {
    returnSubscription({ ...base, status: "ACTIVE_PAID", paymentProvider: "polar" });
    await expect(resolveOneReadState("paid@example.com", now)).resolves.toEqual({
      state: "active_paid",
    });

    returnSubscription({ ...base, status: "ADMIN_OVERRIDE", adminOverride: true });
    await expect(resolveOneReadState("admin@example.com", now)).resolves.toEqual({
      state: "active_paid",
    });
  });

  it("keeps canceled access only until the current period ends", async () => {
    returnSubscription({
      ...base,
      status: "CANCELED",
      paymentProvider: "polar",
      currentPeriodEnd: new Date("2026-08-30T12:00:00.000Z"),
    });
    await expect(resolveOneReadState("canceling@example.com", now)).resolves.toEqual({
      state: "canceled_active",
      periodEndsAt: "2026-08-30T12:00:00.000Z",
    });

    returnSubscription({
      ...base,
      status: "CANCELED",
      paymentProvider: "polar",
      currentPeriodEnd: new Date("2026-07-29T12:00:00.000Z"),
    });
    await expect(resolveOneReadState("expired@example.com", now)).resolves.toEqual({
      state: "expired",
    });
  });

  it("separates email delivery suppression and pausing from paid access", async () => {
    returnSubscription({
      ...base,
      status: "ACTIVE_PAID",
      paymentProvider: "polar",
      emailDeliveryStatus: "UNSUBSCRIBED",
    });
    await expect(resolveOneReadState("paused@example.com", now)).resolves.toEqual({
      state: "active_email_paused",
    });

    returnSubscription({
      ...base,
      status: "ACTIVE_PAID",
      paymentProvider: "polar",
      emailDeliveryStatus: "SUPPRESSED",
    });
    await expect(resolveOneReadState("suppressed@example.com", now)).resolves.toEqual({
      state: "suppressed",
    });
  });
});
