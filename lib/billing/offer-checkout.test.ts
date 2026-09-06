/**
 * Milestone C2 checkout matrix.
 *
 * Covers the six valid (offer, interval) combinations, the fail-closed
 * behaviour when configuration is missing, and the input validation that stops
 * a browser from choosing which Polar product it would like to be billed for.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

const checkoutsCreate = vi.fn();
vi.mock("@polar-sh/sdk", () => ({
  Polar: class {
    checkouts = { create: checkoutsCreate };
  },
}));

import { startOfferCheckout } from "@/lib/billing/offer-checkout";
import { hasValidAccess } from "@/lib/billing/access";
import { parseOfferSelection } from "@/lib/products/registry";
import { checkoutEnvVar } from "@/lib/products/polar-config";
import { prisma as prismaImport } from "@/lib/prisma";
import {
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prisma);
  checkoutsCreate.mockReset();
  checkoutsCreate.mockResolvedValue({ id: "checkout_1", url: "https://polar.test/checkout_1" });
  configureAllOffers();
  process.env.POLAR_ACCESS_TOKEN = "polar_test_token";
  process.env.PUBLIC_BASE_URL = "https://oneread.test";

  prisma.contact.upsert.mockResolvedValue({ id: "contact_1" } as never);
  prisma.productSubscription.findMany.mockResolvedValue([] as never);
  prisma.productSubscription.findUnique.mockResolvedValue(null as never);
  prisma.productSubscription.create.mockResolvedValue({
    id: "sub_1",
    contactId: "contact_1",
    productKey: "one-article",
  } as never);
});

afterEach(() => {
  clearOfferEnv();
  delete process.env.POLAR_ACCESS_TOKEN;
  delete process.env.PUBLIC_BASE_URL;
  vi.clearAllMocks();
});

const VALID = [
  ["one-article", "monthly"],
  ["one-article", "annual"],
  ["one-news", "monthly"],
  ["one-news", "annual"],
  ["one-read", "monthly"],
  ["one-read", "annual"],
] as const;

describe("the six valid checkouts", () => {
  it.each(VALID)("%s %s resolves the configured product id", async (offer, interval) => {
    const result = await startOfferCheckout({ email: "a@b.test", offer, interval });

    expect(result).toEqual({ kind: "redirect", url: "https://polar.test/checkout_1" });
    expect(checkoutsCreate).toHaveBeenCalledTimes(1);
    expect(checkoutsCreate.mock.calls[0]![0].products).toEqual([
      testProductId(offer, interval),
    ]);
  });

  it.each(VALID)("%s %s does not enable a free trial", async (offer, interval) => {
    await startOfferCheckout({ email: "a@b.test", offer, interval });
    expect(checkoutsCreate.mock.calls[0]![0].allowTrial).toBeUndefined();
  });

  it.each(VALID)("%s %s stamps offer identity into metadata", async (offer, interval) => {
    await startOfferCheckout({ email: "a@b.test", offer, interval });
    const { metadata } = checkoutsCreate.mock.calls[0]![0];

    expect(metadata).toMatchObject({
      contactId: "contact_1",
      offerKey: offer,
      billingInterval: interval,
      metadataVersion: "c2",
    });
    // An internal contact id is sufficient to reconcile — no email in metadata.
    expect(metadata.email).toBeUndefined();
  });

  it("persists the intended purchase on the subscription row", async () => {
    await startOfferCheckout({ email: "a@b.test", offer: "one-read", interval: "annual" });
    expect(prisma.productSubscription.update).toHaveBeenCalledWith({
      where: { id: "sub_1" },
      data: expect.objectContaining({
        offerKey: "one-read",
        providerProductId: testProductId("one-read", "annual"),
        plan: "annual",
        paymentProvider: "polar",
      }),
    });
  });
});

describe("fail-closed configuration", () => {
  it.each(VALID)(
    "%s %s refuses to check out when its own variable is unset",
    async (offer, interval) => {
      const envVar = checkoutEnvVar(offer, interval);
      configureAllOffers({ except: [envVar] });

      const result = await startOfferCheckout({ email: "a@b.test", offer, interval });

      expect(result).toEqual({ kind: "not_configured", envVar });
      expect(checkoutsCreate).not.toHaveBeenCalled();
    },
  );

  it("never falls back to another interval, offer, or the legacy product", async () => {
    configureAllOffers({ except: ["POLAR_ONE_READ_ANNUAL_PRODUCT_ID"] });
    const result = await startOfferCheckout({
      email: "a@b.test",
      offer: "one-read",
      interval: "annual",
    });

    expect(result.kind).toBe("not_configured");
    expect(checkoutsCreate).not.toHaveBeenCalled();
    // Specifically: not the monthly bundle, and not the legacy $1 umbrella.
    expect(process.env.POLAR_ONE_READ_MONTHLY_PRODUCT_ID).toBeDefined();
  });

  it("writes nothing to the database when configuration is missing", async () => {
    configureAllOffers({ except: ["POLAR_ONE_NEWS_MONTHLY_PRODUCT_ID"] });
    await startOfferCheckout({ email: "a@b.test", offer: "one-news", interval: "monthly" });

    expect(prisma.contact.upsert).not.toHaveBeenCalled();
    expect(prisma.productSubscription.create).not.toHaveBeenCalled();
  });
});

describe("input validation — the browser cannot pick a provider product", () => {
  it.each([
    ["a raw Polar product id as the offer", testProductId("one-read", "annual"), "annual"],
    ["an unknown offer", "one-everything", "monthly"],
    ["a legacy offer name", "legacy-one-read-umbrella", "monthly"],
    ["an unsupported interval", "one-article", "weekly"],
    ["a missing interval", "one-article", undefined],
    ["a non-string offer", { id: "one-read" }, "monthly"],
    ["an array", ["one-read"], "monthly"],
  ])("rejects %s", (_label, offer, interval) => {
    expect(parseOfferSelection(offer, interval)).toBeNull();
  });

  it("accepts exactly the six registry combinations", () => {
    for (const [offer, interval] of VALID) {
      expect(parseOfferSelection(offer, interval)).toEqual({ offer, interval });
    }
  });
});

describe("double-billing guards", () => {
  it("an already-active row for the same offer is not re-sold", async () => {
    prisma.productSubscription.findMany.mockResolvedValue([
      {
        id: "sub_1",
        contactId: "contact_1",
        productKey: "one-news",
        status: "ACTIVE_PAID",
        paymentProvider: "polar",
        providerSubscriptionId: "polar_sub_1",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: new Date("2099-01-01"),
        pastDueAt: null,
      },
    ] as never);

    const result = await startOfferCheckout({
      email: "a@b.test",
      offer: "one-news",
      interval: "monthly",
    });

    expect(result).toEqual({ kind: "already_active", billingManageable: true });
    expect(checkoutsCreate).not.toHaveBeenCalled();
  });

  it("allows a disjoint second standalone — OneArticle holder buying OneNews", async () => {
    prisma.productSubscription.findMany.mockResolvedValue([
      {
        id: "sub_article",
        contactId: "contact_1",
        productKey: "one-article",
        offerKey: "one-article",
        providerProductId: testProductId("one-article", "monthly"),
        status: "ACTIVE_PAID",
        paymentProvider: "polar",
        providerSubscriptionId: "polar_sub_1",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: new Date("2099-01-01"),
        pastDueAt: null,
      },
    ] as never);

    // The grants are disjoint, so this is a legitimate second purchase rather
    // than a plan change.
    const result = await startOfferCheckout({
      email: "a@b.test",
      offer: "one-news",
      interval: "monthly",
    });

    expect(result).toEqual({ kind: "redirect", url: "https://polar.test/checkout_1" });
  });

  it("an overlapping plan routes to the transition flow instead of a second charge", async () => {
    prisma.productSubscription.findMany.mockResolvedValue([
      {
        id: "sub_1",
        contactId: "contact_1",
        productKey: "one-article",
        offerKey: "one-article",
        status: "ACTIVE_PAID",
        paymentProvider: "polar",
        providerSubscriptionId: "polar_sub_1",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: new Date("2099-01-01"),
        pastDueAt: null,
      },
    ] as never);

    const result = await startOfferCheckout({
      email: "a@b.test",
      offer: "one-read",
      interval: "monthly",
    });

    expect(result).toEqual({ kind: "transition_required", currentOfferKey: "one-article" });
    expect(checkoutsCreate).not.toHaveBeenCalled();
  });
});

describe("duplicate and abandoned checkouts", () => {
  /** A row already holding an open Polar checkout for `offer`/`interval`. */
  function rowWithOpenCheckout(overrides: Record<string, unknown> = {}) {
    return {
      id: "sub_1",
      contactId: "contact_1",
      productKey: "one-read",
      status: "PENDING_CHECKOUT",
      paymentProvider: "polar",
      providerSubscriptionId: null,
      providerCheckoutSessionId: "checkout_1",
      providerCheckoutUrl: "https://polar.test/checkout_1",
      providerCheckoutExpiresAt: new Date(Date.now() + 20 * 60 * 1000),
      providerProductId: testProductId("one-read", "annual"),
      offerKey: "one-read",
      plan: "annual",
      adminOverride: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      pastDueAt: null,
      ...overrides,
    };
  }

  it("resumes the open session instead of opening a second one", async () => {
    prisma.productSubscription.findMany.mockResolvedValue([rowWithOpenCheckout()] as never);

    const result = await startOfferCheckout({
      email: "a@b.test", offer: "one-read", interval: "annual",
    });

    expect(result).toEqual({ kind: "redirect", url: "https://polar.test/checkout_1" });
    expect(checkoutsCreate).not.toHaveBeenCalled();
    expect(prisma.productSubscription.update).not.toHaveBeenCalled();
  });

  it("opens a new session once the stored one has expired", async () => {
    prisma.productSubscription.findMany.mockResolvedValue([
      rowWithOpenCheckout({ providerCheckoutExpiresAt: new Date(Date.now() - 1000) }),
    ] as never);

    const result = await startOfferCheckout({
      email: "a@b.test", offer: "one-read", interval: "annual",
    });

    expect(result).toEqual({ kind: "redirect", url: "https://polar.test/checkout_1" });
    expect(checkoutsCreate).toHaveBeenCalledTimes(1);
  });

  it("opens a new session when the customer switched interval", async () => {
    prisma.productSubscription.findMany.mockResolvedValue([rowWithOpenCheckout()] as never);

    await startOfferCheckout({ email: "a@b.test", offer: "one-read", interval: "monthly" });

    expect(checkoutsCreate).toHaveBeenCalledTimes(1);
    expect(checkoutsCreate.mock.calls[0]![0].products).toEqual([
      testProductId("one-read", "monthly"),
    ]);
  });

  it("records the session URL and expiry so the next request can resume it", async () => {
    checkoutsCreate.mockResolvedValue({
      id: "checkout_2",
      url: "https://polar.test/checkout_2",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });

    await startOfferCheckout({ email: "a@b.test", offer: "one-read", interval: "annual" });

    expect(prisma.productSubscription.update.mock.calls[0]![0].data).toMatchObject({
      providerCheckoutSessionId: "checkout_2",
      providerCheckoutUrl: "https://polar.test/checkout_2",
      providerCheckoutExpiresAt: new Date("2030-01-01T00:00:00.000Z"),
    });
  });

  it("leaves an abandoned checkout without access", async () => {
    // Nothing about starting a checkout grants entitlement; only a provider
    // confirmation does. The row is written as PENDING_CHECKOUT and stays there.
    await startOfferCheckout({ email: "a@b.test", offer: "one-read", interval: "annual" });

    const created = prisma.productSubscription.create.mock.calls[0]![0].data as Record<string, unknown>;
    expect(created.status).toBe("PENDING_CHECKOUT");
    expect(prisma.productSubscription.update.mock.calls[0]![0].data).not.toHaveProperty("status");
    expect(hasValidAccess(rowWithOpenCheckout() as never).allowed).toBe(false);
  });
});

describe("production return and success URLs", () => {
  afterEach(() => vi.unstubAllEnvs());

  function inProduction(baseUrl: string | undefined) {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_BASE_URL", baseUrl);
  }

  it("builds both URLs from the canonical HTTPS origin", async () => {
    inProduction("https://www.oneread.email");

    await startOfferCheckout({ email: "a@b.test", offer: "one-read", interval: "annual" });

    const call = checkoutsCreate.mock.calls[0]![0];
    expect(call.returnUrl).toBe("https://www.oneread.email/subscribe");
    expect(call.successUrl).toBe(
      "https://www.oneread.email/subscribe/success?checkout_id={CHECKOUT_ID}",
    );
  });

  it.each([
    ["no origin is configured", undefined],
    ["the origin is plaintext HTTP", "http://www.oneread.email"],
    ["the origin is not a URL", "www.oneread.email"],
  ])("refuses to create a checkout when %s", async (_label, baseUrl) => {
    inProduction(baseUrl);

    await expect(
      startOfferCheckout({ email: "a@b.test", offer: "one-read", interval: "annual" }),
    ).rejects.toThrow(/PUBLIC_BASE_URL/);
    expect(checkoutsCreate).not.toHaveBeenCalled();
  });

  it("refuses a plaintext operator-supplied success URL", async () => {
    inProduction("https://www.oneread.email");
    vi.stubEnv("POLAR_ONEREAD_SUCCESS_URL", "http://www.oneread.email/subscribe/success");

    await expect(
      startOfferCheckout({ email: "a@b.test", offer: "one-read", interval: "annual" }),
    ).rejects.toThrow(/POLAR_ONEREAD_SUCCESS_URL must use HTTPS/);
  });
});
