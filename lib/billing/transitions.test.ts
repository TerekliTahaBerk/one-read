/**
 * Milestone C2 subscription transitions.
 *
 * Every case here is about one of two failure modes: a subscriber losing access
 * they paid for, or a grandfathered price being destroyed without them
 * knowingly choosing it. The provider call is injected, so these exercise the
 * real decision logic with no network.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import {
  GRANDFATHER_FORFEIT_WARNING,
  previewTransition,
  settleTransitionsForSubscription,
  startTransition,
  type ProviderPlanChange,
  type TransitionSubscription,
} from "@/lib/billing/transitions";
import { prisma as prismaImport } from "@/lib/prisma";
import {
  LEGACY_ONEREAD_PRODUCT_ID,
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prisma);
  configureAllOffers();
  prisma.subscriptionTransition.create.mockResolvedValue({ id: "trans_1" } as never);
});

afterEach(() => {
  clearOfferEnv();
  vi.clearAllMocks();
});

function sub(overrides: Partial<TransitionSubscription> = {}): TransitionSubscription {
  return {
    id: "sub_1",
    contactId: "contact_1",
    productKey: "one-article",
    status: "ACTIVE_PAID",
    plan: "monthly",
    offerKey: "one-article",
    providerProductId: testProductId("one-article", "monthly"),
    providerSubscriptionId: "polar_sub_1",
    paymentProvider: "polar",
    ...overrides,
  };
}

const legacySub = () =>
  sub({
    productKey: "one-read",
    offerKey: "legacy-one-read-umbrella",
    providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
  });

/** A provider that immediately switches to the requested product. */
function immediateChange(): ProviderPlanChange {
  return vi.fn(async ({ providerProductId }) => ({
    productId: providerProductId,
    status: "active",
    currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
  }));
}

/** A provider that defers the change to the next billing period. */
function deferredChange(currentProductId: string): ProviderPlanChange {
  return vi.fn(async () => ({
    productId: currentProductId,
    status: "active",
    currentPeriodEnd: new Date("2026-07-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
  }));
}

/* ------------------------------- upgrades -------------------------------- */

describe("Article → Bundle", () => {
  it("is an immediate upgrade billed by the provider", async () => {
    const changePlan = immediateChange();
    const result = await startTransition({
      sub: sub(),
      target: { offer: "one-read", interval: "monthly" },
      changePlan,
    });

    expect(result).toMatchObject({ ok: true, state: "APPLIED", appliedNow: true });
    expect(changePlan).toHaveBeenCalledWith({
      providerSubscriptionId: "polar_sub_1",
      providerProductId: testProductId("one-read", "monthly"),
      prorationBehavior: "invoice",
    });
  });

  it("changes the plan in place, so there is no second subscription to double-bill", async () => {
    await startTransition({
      sub: sub(),
      target: { offer: "one-read", interval: "monthly" },
      changePlan: immediateChange(),
    });

    // One provider subscription throughout: the row is updated, never duplicated.
    expect(prisma.productSubscription.create).not.toHaveBeenCalled();
    expect(prisma.productSubscription.update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: {
        offerKey: "one-read",
        providerProductId: testProductId("one-read", "monthly"),
        plan: "monthly",
      },
    });
  });

  it("requires no grandfathering acknowledgement", async () => {
    const preview = previewTransition(sub(), { offer: "one-read", interval: "monthly" });
    expect(preview.ok).toBe(true);
    if (preview.ok) expect(preview.plan.forfeitsGrandfathering).toBe(false);
  });
});

describe("News → Bundle", () => {
  it("upgrades immediately", async () => {
    const changePlan = immediateChange();
    const result = await startTransition({
      sub: sub({
        productKey: "one-news",
        offerKey: "one-news",
        providerProductId: testProductId("one-news", "monthly"),
      }),
      target: { offer: "one-read", interval: "monthly" },
      changePlan,
    });

    expect(result).toMatchObject({ ok: true, appliedNow: true });
    expect(changePlan).toHaveBeenCalledWith(
      expect.objectContaining({ prorationBehavior: "invoice" }),
    );
  });
});

/* ------------------------- legacy $1 → bundle ---------------------------- */

describe("legacy $1 → Bundle", () => {
  it("refuses without an explicit acknowledgement, returning the warning", () => {
    const preview = previewTransition(legacySub(), { offer: "one-read", interval: "monthly" });

    expect(preview).toMatchObject({
      ok: false,
      refusal: "grandfather_acknowledgement_required",
      message: GRANDFATHER_FORFEIT_WARNING,
    });
  });

  it("does not touch the provider or the database when unacknowledged", async () => {
    const changePlan = immediateChange();
    const result = await startTransition({
      sub: legacySub(),
      target: { offer: "one-read", interval: "monthly" },
      changePlan,
    });

    expect(result).toMatchObject({ ok: false, refusal: "grandfather_acknowledgement_required" });
    expect(changePlan).not.toHaveBeenCalled();
    expect(prisma.subscriptionTransition.create).not.toHaveBeenCalled();
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("proceeds once acknowledged, and records the forfeited legacy identity", async () => {
    const result = await startTransition({
      sub: legacySub(),
      target: { offer: "one-read", interval: "monthly" },
      acknowledgeGrandfatherLoss: true,
      changePlan: immediateChange(),
    });

    expect(result.ok).toBe(true);
    const created = prisma.subscriptionTransition.create.mock.calls[0]![0].data as any;
    expect(created).toMatchObject({
      fromOfferKey: "legacy-one-read-umbrella",
      fromProviderProductId: LEGACY_ONEREAD_PRODUCT_ID,
      fromProviderSubscriptionId: "polar_sub_1",
      fromGrandfathered: true,
      toOfferKey: "one-read",
    });
    expect(created.grandfatherAcknowledgedAt).toBeInstanceOf(Date);
  });

  it("an unidentified historical one-read row is also protected", () => {
    const preview = previewTransition(
      sub({ productKey: "one-read", offerKey: null, providerProductId: null }),
      { offer: "one-read", interval: "annual" },
    );
    expect(preview).toMatchObject({ refusal: "grandfather_acknowledgement_required" });
  });

  it("treated as an upgrade, so the subscriber is never left mid-change", () => {
    const preview = previewTransition(
      legacySub(),
      { offer: "one-read", interval: "monthly" },
      { acknowledgeGrandfatherLoss: true },
    );
    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.plan.kind).toBe("upgrade");
      expect(preview.plan.effective).toBe("immediately");
      expect(preview.plan.warning).toBe(GRANDFATHER_FORFEIT_WARNING);
    }
  });
});

/* ------------------------------ downgrades -------------------------------- */

describe("Bundle → standalone downgrades", () => {
  const bundle = () =>
    sub({
      productKey: "one-read",
      offerKey: "one-read",
      providerProductId: testProductId("one-read", "monthly"),
    });

  it.each(["one-article", "one-news"] as const)(
    "Bundle → %s is scheduled for the next billing period",
    async (offer) => {
      const changePlan = deferredChange(testProductId("one-read", "monthly"));
      const result = await startTransition({
        sub: bundle(),
        target: { offer, interval: "monthly" },
        changePlan,
      });

      expect(result).toMatchObject({ ok: true, state: "PENDING_PROVIDER", appliedNow: false });
      expect(changePlan).toHaveBeenCalledWith(
        expect.objectContaining({ prorationBehavior: "next_period" }),
      );
    },
  );

  it("keeps full bundle access until the provider actually switches the product", async () => {
    await startTransition({
      sub: bundle(),
      target: { offer: "one-article", interval: "monthly" },
      changePlan: deferredChange(testProductId("one-read", "monthly")),
    });

    // Identity is untouched, so entitlement resolution still sees the bundle.
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("settles only when the provider reports the target product", async () => {
    const pending = [
      { id: "trans_1", toProviderProductId: testProductId("one-article", "monthly") },
    ];
    prisma.subscriptionTransition.findMany.mockResolvedValue(pending as never);

    // Still on the bundle: nothing settles.
    expect(
      await settleTransitionsForSubscription({
        subscriptionId: "sub_1",
        providerProductId: testProductId("one-read", "monthly"),
        status: "ACTIVE_PAID",
      }),
    ).toBe(0);

    // The period rolls over and Polar switches the product.
    expect(
      await settleTransitionsForSubscription({
        subscriptionId: "sub_1",
        providerProductId: testProductId("one-article", "monthly"),
        status: "ACTIVE_PAID",
      }),
    ).toBe(1);
    expect(prisma.subscriptionTransition.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["trans_1"] } },
      data: { state: "APPLIED" },
    });
  });
});

/* --------------------------- interval changes ----------------------------- */

describe("monthly ↔ annual", () => {
  it("monthly → annual applies immediately", async () => {
    const changePlan = immediateChange();
    const result = await startTransition({
      sub: sub(),
      target: { offer: "one-article", interval: "annual" },
      changePlan,
    });

    expect(result).toMatchObject({ ok: true, appliedNow: true });
    const preview = previewTransition(sub(), { offer: "one-article", interval: "annual" });
    if (preview.ok) expect(preview.plan.kind).toBe("interval_change");
    expect(changePlan).toHaveBeenCalledWith(
      expect.objectContaining({ prorationBehavior: "invoice" }),
    );
  });

  it("annual → monthly waits for the period the subscriber already paid for", async () => {
    const annual = sub({
      plan: "annual",
      providerProductId: testProductId("one-article", "annual"),
    });
    const changePlan = deferredChange(testProductId("one-article", "annual"));

    const result = await startTransition({
      sub: annual,
      target: { offer: "one-article", interval: "monthly" },
      changePlan,
    });

    expect(result).toMatchObject({ ok: true, state: "PENDING_PROVIDER" });
    expect(changePlan).toHaveBeenCalledWith(
      expect.objectContaining({ prorationBehavior: "next_period" }),
    );
  });

  it("rejects a change to the plan already held", () => {
    expect(previewTransition(sub(), { offer: "one-article", interval: "monthly" })).toMatchObject({
      ok: false,
      refusal: "already_on_target",
    });
  });
});

/* ------------------------------- failures --------------------------------- */

describe("failures never create an access gap", () => {
  it("a provider error leaves the subscription exactly as it was", async () => {
    const changePlan: ProviderPlanChange = vi.fn(async () => {
      throw new Error("Polar unavailable");
    });

    const result = await startTransition({
      sub: sub(),
      target: { offer: "one-read", interval: "monthly" },
      changePlan,
    });

    expect(result).toMatchObject({ ok: false, refusal: "provider_error" });
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
    expect(prisma.subscriptionTransition.update).toHaveBeenCalledWith({
      where: { id: "trans_1" },
      data: { state: "FAILED", failureReason: "Polar unavailable" },
    });
  });

  it("an unconfigured destination is refused before any provider call", async () => {
    configureAllOffers({ except: ["POLAR_ONE_READ_ANNUAL_PRODUCT_ID"] });
    const changePlan = immediateChange();

    const result = await startTransition({
      sub: sub(),
      target: { offer: "one-read", interval: "annual" },
      changePlan,
    });

    expect(result).toMatchObject({ ok: false, refusal: "target_not_configured" });
    expect(changePlan).not.toHaveBeenCalled();
    expect(prisma.subscriptionTransition.create).not.toHaveBeenCalled();
  });

  it("does not leak the missing variable name to the subscriber", async () => {
    configureAllOffers({ except: ["POLAR_ONE_NEWS_MONTHLY_PRODUCT_ID"] });
    const result = await startTransition({
      sub: sub(),
      target: { offer: "one-news", interval: "monthly" },
      changePlan: immediateChange(),
    });

    if (!result.ok) expect(result.message).not.toMatch(/POLAR_/);
  });

  it("without a live provider subscription, the subscriber is sent to checkout", async () => {
    const result = await startTransition({
      sub: sub({ paymentProvider: null, providerSubscriptionId: null }),
      target: { offer: "one-read", interval: "monthly" },
      changePlan: immediateChange(),
    });

    expect(result).toMatchObject({ ok: false, refusal: "checkout_required" });
  });

  it("refuses when there is no subscription at all", () => {
    expect(previewTransition(null, { offer: "one-read", interval: "monthly" })).toMatchObject({
      ok: false,
      refusal: "no_subscription",
    });
  });
});

describe("no local proration", () => {
  it("passes a behaviour to the provider and never an amount", async () => {
    const changePlan = immediateChange();
    await startTransition({
      sub: sub(),
      target: { offer: "one-read", interval: "annual" },
      changePlan,
    });

    const args = (changePlan as unknown as { mock: { calls: any[][] } }).mock.calls[0]![0];
    expect(Object.keys(args).sort()).toEqual([
      "prorationBehavior",
      "providerProductId",
      "providerSubscriptionId",
    ]);
  });
});
