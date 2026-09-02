import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { prisma as prismaImport } from "@/lib/prisma";
import {
  resolveOneArticleEligibilityForContact,
  resolveOneArticleEligibilityForContacts,
} from "@/lib/oneread/access";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;
const now = new Date("2026-09-02T12:00:00.000Z");

const completePreferences = { summaryLanguage: "English" };

/**
 * Each case is one contact's rows. The set-based resolver introduced for
 * dispatch must agree with the original per-contact resolver on every one of
 * them — that equivalence is the whole point of the optimization.
 */
const CASES: { name: string; rows: Record<string, unknown>[] }[] = [
  {
    name: "umbrella subscriber with complete preferences",
    rows: [
      {
        id: "a",
        contactId: "c",
        productKey: "one-article",
        status: "PENDING_CHECKOUT",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: completePreferences,
      },
      {
        id: "b",
        contactId: "c",
        productKey: "one-read",
        status: "ACTIVE_PAID",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: null,
      },
    ],
  },
  {
    name: "legacy paid OneArticle subscriber with no umbrella row",
    rows: [
      {
        id: "a",
        contactId: "c",
        productKey: "one-article",
        status: "ACTIVE_PAID",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: completePreferences,
      },
    ],
  },
  {
    name: "unsubscribed from email",
    rows: [
      {
        id: "a",
        contactId: "c",
        productKey: "one-article",
        status: "ACTIVE_PAID",
        emailDeliveryStatus: "UNSUBSCRIBED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: completePreferences,
      },
    ],
  },
  {
    name: "suppressed after a bounce or complaint",
    rows: [
      {
        id: "a",
        contactId: "c",
        productKey: "one-article",
        status: "ACTIVE_PAID",
        emailDeliveryStatus: "SUPPRESSED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: completePreferences,
      },
    ],
  },
  {
    name: "billing lapsed on the umbrella row",
    rows: [
      {
        id: "a",
        contactId: "c",
        productKey: "one-article",
        status: "PENDING_CHECKOUT",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: completePreferences,
      },
      {
        id: "b",
        contactId: "c",
        productKey: "one-read",
        status: "CANCELED",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: null,
      },
    ],
  },
  {
    name: "preferences never completed",
    rows: [
      {
        id: "a",
        contactId: "c",
        productKey: "one-article",
        status: "PENDING_PREFERENCES",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: null,
      },
    ],
  },
  {
    name: "admin override",
    rows: [
      {
        id: "a",
        contactId: "c",
        productKey: "one-article",
        status: "ADMIN_OVERRIDE",
        emailDeliveryStatus: "SUBSCRIBED",
        adminOverride: true,
        trialEndsAt: null,
        currentPeriodEnd: null,
        preferences: completePreferences,
      },
    ],
  },
  {
    name: "no rows at all",
    rows: [],
  },
];

beforeEach(() => {
  mockReset(prisma);
});

describe("OneArticle eligibility: per-contact and set-based resolvers agree", () => {
  it.each(CASES)("$name", async ({ rows }) => {
    // Per-contact path: one lookup for the holder, one for the umbrella row.
    prisma.productSubscription.findUnique.mockImplementation((async (args: {
      where: { contactId_productKey: { productKey: string } };
    }) => {
      const key = args.where.contactId_productKey.productKey;
      return rows.find((row) => row.productKey === key) ?? null;
    }) as never);
    const single = await resolveOneArticleEligibilityForContact("c", now);

    // Set-based path: a single query returning every relevant row.
    prisma.productSubscription.findMany.mockResolvedValue(rows as never);
    const batched = await resolveOneArticleEligibilityForContacts(["c"], now);

    expect(batched.get("c")).toEqual(single);
  });

  it("issues exactly one query for many contacts", async () => {
    prisma.productSubscription.findMany.mockResolvedValue([] as never);
    const ids = Array.from({ length: 50 }, (_, index) => `contact_${index}`);

    const results = await resolveOneArticleEligibilityForContacts(ids, now);

    expect(prisma.productSubscription.findMany).toHaveBeenCalledTimes(1);
    expect(results.size).toBe(ids.length);
  });

  it("does not query at all for an empty contact list", async () => {
    await expect(resolveOneArticleEligibilityForContacts([], now)).resolves.toEqual(new Map());
    expect(prisma.productSubscription.findMany).not.toHaveBeenCalled();
  });
});
