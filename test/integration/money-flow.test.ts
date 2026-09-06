/**
 * P1.6 — the money-flow chain against a real database.
 *
 * The layers below this one already exist: pure policy is covered by unit
 * tests, and the webhook matrix drives the state machine with a mocked Prisma.
 * What neither can prove is the part the revenue actually rests on — that a
 * genuinely signed provider delivery, applied through the real route, moves
 * real rows in Postgres, and that the entitlement resolver then agrees with
 * what the provider said.
 *
 * So everything here is real except the two outbound network calls we must not
 * make from a test: creating a Polar checkout and Resend delivery. Signature
 * verification, idempotency (a database unique constraint), the monotonic
 * billing clock (a conditional write) and every lifecycle transition run
 * exactly as they do in production.
 *
 * Requires PRISMA_DATABASE_URL to point at a throwaway database — never the
 * production one. See docs/MONEY_FLOW_REGRESSION_GATE.md.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Only the outbound provider call is faked. `applyPolarWebhookPayload` — the
// state machine under test — is the real one.
const createPolarOfferCheckout = vi.fn();
vi.mock("@/lib/billing/polar", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/polar")>();
  return {
    ...actual,
    createPolarOfferCheckout: (...args: unknown[]) => createPolarOfferCheckout(...args),
  };
});

// Verification must not send mail. A failed send is a supported path: it makes
// `requestVerificationCode` hand the code back as `devCode`, which is how the
// test reads the code a subscriber would read in their inbox.
vi.mock("@/lib/resend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/resend")>();
  return {
    ...actual,
    sendDailyEmail: async () => {
      throw new Error("email delivery is disabled in the money-flow gate");
    },
  };
});

import { prisma } from "@/lib/prisma";
import { POST as polarWebhook } from "@/app/api/webhook/polar/route";
import { startOfferCheckout } from "@/lib/billing/offer-checkout";
import { checkoutIntent, parseCheckoutIntent } from "@/lib/billing/checkout-intent";
import {
  confirmVerificationCode,
  requestVerificationCode,
  VERIFICATION_PURPOSES,
} from "@/lib/oneread/verification";
import { resolveEntitlements } from "@/lib/products/entitlements";
import { hasValidAccess } from "@/lib/billing/access";
import { OFFERS, type BillingIntervalKey, type OfferKey } from "@/lib/products/registry";
import { clearOfferEnv, configureAllOffers, testProductId } from "@/test/fixtures/polar-offers";
import {
  DEFAULT_WEBHOOK_SECRET,
  forgedPolarDelivery,
  signedPolarDelivery,
  type PolarDeliveryOptions,
} from "@/test/fixtures/polar-webhook-delivery";

const RUN = `y163-${process.pid}-${Date.now()}`;
const emails: string[] = [];

const T_ACTIVATE = new Date("2026-06-01T00:00:00Z");
const T_LATER = new Date("2026-06-15T00:00:00Z");
const T_EARLIER = new Date("2026-05-01T00:00:00Z");
const PERIOD_END = new Date("2027-06-01T00:00:00Z");

let seq = 0;
function nextEmail(label: string): string {
  const email = `${RUN}-${label}-${seq++}@example.test`;
  emails.push(email);
  return email;
}

/** The rows the entitlement resolver reads, straight out of the database. */
async function subscriptionsFor(email: string) {
  const contact = await prisma.contact.findUnique({
    where: { email },
    include: { subscriptions: true },
  });
  return contact?.subscriptions ?? [];
}

async function entitlementsFor(email: string, now = T_ACTIVATE) {
  return resolveEntitlements(await subscriptionsFor(email), now);
}

async function rowFor(email: string, productKey: string) {
  const rows = await subscriptionsFor(email);
  const row = rows.find((r) => r.productKey === productKey);
  if (!row) throw new Error(`no ${productKey} subscription for ${email}`);
  return row;
}

async function deliver(options: PolarDeliveryOptions, forged = false) {
  const request = forged ? forgedPolarDelivery(options) : signedPolarDelivery(options);
  const response = await polarWebhook(request);
  const body = response.status === 403 ? null : await response.json();
  return { status: response.status, body: body as Record<string, unknown> | null };
}

/**
 * Product selection → email → verification → checkout boundary.
 *
 * Returns the subscription row the boundary left behind, in the state a
 * subscriber sitting on Polar's hosted page would be in: PENDING_CHECKOUT with
 * no entitlement.
 */
async function reachCheckoutBoundary(offer: OfferKey, interval: BillingIntervalKey) {
  const email = nextEmail(offer);

  const requested = await requestVerificationCode({
    email,
    purpose: VERIFICATION_PURPOSES.signup,
  });
  if (!requested.ok) throw new Error(`verification refused: ${requested.reason}`);
  const code = requested.devCode;
  expect(code, "the verification code the subscriber would receive").toBeTruthy();

  const confirmed = await confirmVerificationCode({
    email,
    purpose: VERIFICATION_PURPOSES.signup,
    code: code!,
  });
  expect(confirmed.ok).toBe(true);

  // The session a confirmed code buys is bound to this exact plan.
  expect(parseCheckoutIntent(offer, interval)).toBe(checkoutIntent(offer, interval));

  createPolarOfferCheckout.mockResolvedValue({ url: `https://polar.test/checkout/${offer}` });
  const result = await startOfferCheckout({ email, offer, interval });
  expect(result).toEqual({ kind: "redirect", url: `https://polar.test/checkout/${offer}` });

  return { email, code: code!, row: await rowFor(email, offer) };
}

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(() => {
  configureAllOffers();
  process.env.POLAR_WEBHOOK_SECRET = DEFAULT_WEBHOOK_SECRET;
  process.env.EMAIL_VERIFICATION_SECRET ||= "money-flow-gate-secret";
  createPolarOfferCheckout.mockReset();
});

afterEach(() => {
  clearOfferEnv();
  vi.clearAllMocks();
});

afterAll(async () => {
  await prisma.billingEvent.deleteMany({ where: { providerEventId: { startsWith: RUN } } });
  await prisma.emailVerificationCode.deleteMany({ where: { email: { in: emails } } });
  await prisma.contact.deleteMany({ where: { email: { in: emails } } });
  await prisma.$disconnect();
});

/* ------------------------------ happy paths ------------------------------ */

describe.each(["one-article", "one-news", "one-read"] as const)(
  "%s: purchase reaches entitlement",
  (offer) => {
    it("selection → verification → checkout → signed webhook → entitlement", async () => {
      const { email, row } = await reachCheckoutBoundary(offer, "annual");

      // Before the provider confirms, nothing is granted. This is the
      // abandonment state too: it is what a subscriber who closes the Polar tab
      // is left with.
      expect(row.status).toBe("PENDING_CHECKOUT");
      expect(hasValidAccess(row).allowed).toBe(false);
      expect((await entitlementsFor(email)).hasAnyAccess).toBe(false);

      const { status, body } = await deliver({
        type: "subscription.active",
        productId: testProductId(offer, "annual"),
        subscriptionId: `polar_sub_${row.id}`,
        customerEmail: email,
        occurredAt: T_ACTIVATE,
        currentPeriodEnd: PERIOD_END,
        metadata: { productSubscriptionId: row.id, contactId: row.contactId },
        eventId: `${RUN}-activate-${offer}`,
      });

      expect(status).toBe(200);
      expect(body).toMatchObject({ ok: true, outcome: "applied" });

      const after = await rowFor(email, offer);
      expect(after.status).toBe("ACTIVE_PAID");
      expect(after.offerKey).toBe(offer);
      expect(after.plan).toBe("annual");
      expect(after.providerProductId).toBe(testProductId(offer, "annual"));
      expect(after.providerSubscriptionId).toBe(`polar_sub_${row.id}`);
      expect(after.billingStateUpdatedAt?.toISOString()).toBe(T_ACTIVATE.toISOString());

      // Provider truth → local state → entitlement: the offer's own grants,
      // and nothing beyond them.
      const entitlements = await entitlementsFor(email);
      for (const product of ["one-article", "one-news"] as const) {
        expect(entitlements.byProduct[product].granted).toBe(
          OFFERS[offer].grants.includes(product),
        );
      }
      expect(entitlements.grandfatheredPlans).toEqual([]);
    });
  },
);

/* ------------------------- verification boundary ------------------------- */

describe("the verification boundary refuses what it should", () => {
  it("a replayed verification code is refused — the code is single-use", async () => {
    const email = nextEmail("replay");
    const requested = await requestVerificationCode({
      email,
      purpose: VERIFICATION_PURPOSES.signup,
    });
    if (!requested.ok) throw new Error("verification refused");

    const first = await confirmVerificationCode({
      email,
      purpose: VERIFICATION_PURPOSES.signup,
      code: requested.devCode!,
    });
    expect(first.ok).toBe(true);

    const replay = await confirmVerificationCode({
      email,
      purpose: VERIFICATION_PURPOSES.signup,
      code: requested.devCode!,
    });
    expect(replay).toEqual({ ok: false, reason: "invalid" });
  });

  it("an expired code is refused without being consumed", async () => {
    const email = nextEmail("expired");
    const requested = await requestVerificationCode({
      email,
      purpose: VERIFICATION_PURPOSES.signup,
    });
    if (!requested.ok) throw new Error("verification refused");

    await prisma.emailVerificationCode.updateMany({
      where: { email },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const result = await confirmVerificationCode({
      email,
      purpose: VERIFICATION_PURPOSES.signup,
      code: requested.devCode!,
    });
    expect(result).toEqual({ ok: false, reason: "expired" });
    const row = await prisma.emailVerificationCode.findFirst({ where: { email } });
    expect(row?.consumedAt).toBeNull();
  });

  it("an invalid code costs an attempt and never verifies", async () => {
    const email = nextEmail("invalid");
    const requested = await requestVerificationCode({
      email,
      purpose: VERIFICATION_PURPOSES.signup,
    });
    if (!requested.ok) throw new Error("verification refused");

    const wrong = requested.devCode === "000000" ? "111111" : "000000";
    const result = await confirmVerificationCode({
      email,
      purpose: VERIFICATION_PURPOSES.signup,
      code: wrong,
    });
    expect(result.ok).toBe(false);
    const row = await prisma.emailVerificationCode.findFirst({ where: { email } });
    expect(row?.attempts).toBe(1);
    expect(row?.consumedAt).toBeNull();
  });

  it("an unknown offer never reaches a provider product", () => {
    expect(parseCheckoutIntent("one-reed", "annual")).toBeNull();
    expect(parseCheckoutIntent("prod_test_one_read_annual", "annual")).toBeNull();
    expect(parseCheckoutIntent("one-read", "weekly")).toBeNull();
  });
});

it("an abandoned checkout leaves the row pending and grants nothing", async () => {
  const { email, row } = await reachCheckoutBoundary("one-article", "monthly");

  // No webhook ever arrives: the subscriber closed the Polar tab.
  expect(row.status).toBe("PENDING_CHECKOUT");
  expect(row.paidAt).toBeNull();
  expect(row.providerSubscriptionId).toBeNull();
  expect((await entitlementsFor(email)).hasAnyAccess).toBe(false);
});

/* ---------------------------- webhook safety ----------------------------- */

describe("webhook safety, against the real signature check", () => {
  it("an invalid signature is refused and writes nothing at all", async () => {
    const before = await prisma.billingEvent.count();

    const { status } = await deliver(
      {
        type: "subscription.active",
        productId: testProductId("one-read", "annual"),
        eventId: `${RUN}-forged`,
      },
      true,
    );

    expect(status).toBe(403);
    expect(await prisma.billingEvent.count()).toBe(before);
    expect(
      await prisma.billingEvent.findUnique({ where: { providerEventId: `${RUN}-forged` } }),
    ).toBeNull();
  });

  it("a redelivered event is acknowledged once and applied once", async () => {
    const { email, row } = await reachCheckoutBoundary("one-article", "annual");
    const delivery: PolarDeliveryOptions = {
      type: "subscription.active",
      productId: testProductId("one-article", "annual"),
      subscriptionId: `polar_sub_${row.id}`,
      customerEmail: email,
      occurredAt: T_ACTIVATE,
      metadata: { productSubscriptionId: row.id },
      eventId: `${RUN}-duplicate`,
    };

    const first = await deliver(delivery);
    expect(first.body).toMatchObject({ outcome: "applied" });
    const afterFirst = await rowFor(email, "one-article");

    const second = await deliver(delivery);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ ok: true, duplicate: true });

    // One audit row, and state identical to after the first delivery.
    const events = await prisma.billingEvent.findMany({
      where: { providerEventId: `${RUN}-duplicate` },
    });
    expect(events).toHaveLength(1);
    const afterSecond = await rowFor(email, "one-article");
    expect(afterSecond.updatedAt.toISOString()).toBe(afterFirst.updatedAt.toISOString());
    expect(afterSecond.billingStateUpdatedAt?.toISOString()).toBe(T_ACTIVATE.toISOString());
  });

  it("a stale, out-of-order event cannot regress billing state", async () => {
    const { email, row } = await reachCheckoutBoundary("one-news", "annual");
    const base = {
      productId: testProductId("one-news", "annual"),
      subscriptionId: `polar_sub_${row.id}`,
      customerEmail: email,
      metadata: { productSubscriptionId: row.id },
    } as const;

    await deliver({
      ...base,
      type: "subscription.active",
      occurredAt: T_LATER,
      eventId: `${RUN}-order-new`,
    });
    expect((await rowFor(email, "one-news")).status).toBe("ACTIVE_PAID");

    // An older cancellation, delivered late. Accepting it would revoke access
    // the subscriber has already paid for.
    const stale = await deliver({
      ...base,
      type: "subscription.canceled",
      status: "canceled",
      occurredAt: T_EARLIER,
      canceledAt: T_EARLIER,
      eventId: `${RUN}-order-old`,
    });

    expect(stale.body).toMatchObject({ outcome: "ignored_stale" });
    const after = await rowFor(email, "one-news");
    expect(after.status).toBe("ACTIVE_PAID");
    expect(after.billingStateUpdatedAt?.toISOString()).toBe(T_LATER.toISOString());
    expect((await entitlementsFor(email, T_LATER)).byProduct["one-news"].granted).toBe(true);
  });

  it("an unknown provider product is recorded and never granted", async () => {
    const { email, row } = await reachCheckoutBoundary("one-article", "annual");

    const result = await deliver({
      type: "subscription.active",
      productId: "prod_some_other_merchants_product",
      subscriptionId: `polar_sub_${row.id}`,
      customerEmail: email,
      occurredAt: T_ACTIVATE,
      metadata: { productSubscriptionId: row.id },
      eventId: `${RUN}-unknown-product`,
    });

    expect(result.body).toMatchObject({ outcome: "unrecognized_product" });
    const after = await rowFor(email, "one-article");
    expect(after.status).toBe("PENDING_CHECKOUT");
    expect((await entitlementsFor(email)).hasAnyAccess).toBe(false);

    // Auditable rather than silently dropped, so it can be reconciled.
    const event = await prisma.billingEvent.findUnique({
      where: { providerEventId: `${RUN}-unknown-product` },
    });
    expect(event?.outcome).toBe("unrecognized_product");
  });

  it("an event with no correlation to any row is recorded as no_subscription", async () => {
    const result = await deliver({
      type: "subscription.active",
      productId: testProductId("one-read", "annual"),
      subscriptionId: `polar_sub_${RUN}_orphan`,
      customerEmail: `${RUN}-nobody@example.test`,
      occurredAt: T_ACTIVATE,
      metadata: {},
      eventId: `${RUN}-orphan`,
    });

    expect(result.body).toMatchObject({ outcome: "no_subscription" });
    const event = await prisma.billingEvent.findUnique({
      where: { providerEventId: `${RUN}-orphan` },
    });
    expect(event?.outcome).toBe("no_subscription");
  });

  it("a retry re-signed under a new delivery id settles on the same state", async () => {
    // The idempotency key is the provider's delivery id, so a retry Polar
    // re-signs under a fresh id gets past that guard. What must then hold is
    // the monotonic clock: re-applying the same provider moment is allowed only
    // because it cannot move state anywhere new.
    const { email, row } = await reachCheckoutBoundary("one-article", "annual");
    const base = {
      type: "subscription.active",
      productId: testProductId("one-article", "annual"),
      subscriptionId: `polar_sub_${row.id}`,
      customerEmail: email,
      occurredAt: T_ACTIVATE,
      currentPeriodEnd: PERIOD_END,
      metadata: { productSubscriptionId: row.id },
    } as const;

    await deliver({ ...base, eventId: `${RUN}-resigned-a` });
    const first = await rowFor(email, "one-article");

    const retry = await deliver({ ...base, eventId: `${RUN}-resigned-b` });
    expect(retry.status).toBe(200);

    const second = await rowFor(email, "one-article");
    expect(second.status).toBe("ACTIVE_PAID");
    expect(second.offerKey).toBe(first.offerKey);
    expect(second.plan).toBe(first.plan);
    expect(second.paidAt?.toISOString()).toBe(first.paidAt?.toISOString());
    expect(second.billingStateUpdatedAt?.toISOString()).toBe(T_ACTIVATE.toISOString());
    expect(second.currentPeriodEnd?.toISOString()).toBe(first.currentPeriodEnd?.toISOString());
  });
});

/* ------------------------------- lifecycle ------------------------------- */

describe("lifecycle, end to end in the database", () => {
  async function activated(offer: OfferKey, label: string) {
    const { email, row } = await reachCheckoutBoundary(offer, "annual");
    const base = {
      productId: testProductId(offer, "annual"),
      subscriptionId: `polar_sub_${row.id}`,
      customerEmail: email,
      metadata: { productSubscriptionId: row.id },
    } as const;
    await deliver({
      ...base,
      type: "subscription.active",
      occurredAt: T_ACTIVATE,
      currentPeriodEnd: PERIOD_END,
      eventId: `${RUN}-${label}-active`,
    });
    expect((await rowFor(email, offer)).status).toBe("ACTIVE_PAID");
    return { email, base };
  }

  it("active → cancel-at-period-end → expired after the paid period", async () => {
    const { email, base } = await activated("one-read", "cancel");

    const canceled = await deliver({
      ...base,
      type: "subscription.canceled",
      status: "active",
      cancelAtPeriodEnd: true,
      canceledAt: T_LATER,
      occurredAt: T_LATER,
      currentPeriodEnd: PERIOD_END,
      endsAt: PERIOD_END,
      eventId: `${RUN}-cancel-canceled`,
    });
    expect(canceled.body).toMatchObject({ outcome: "applied" });

    const afterCancel = await rowFor(email, "one-read");
    expect(afterCancel.cancelAtPeriodEnd).toBe(true);
    expect(afterCancel.currentPeriodEnd?.toISOString()).toBe(PERIOD_END.toISOString());

    // The paid period is still running: both bundled products stay granted.
    const during = await entitlementsFor(email, T_LATER);
    expect(during.byProduct["one-article"].granted).toBe(true);
    expect(during.byProduct["one-news"].granted).toBe(true);

    // Past the announced end, access is gone — without waiting for a revoke.
    const after = await entitlementsFor(email, new Date(PERIOD_END.getTime() + 1_000));
    expect(after.hasAnyAccess).toBe(false);

    const revoked = await deliver({
      ...base,
      type: "subscription.revoked",
      status: "canceled",
      occurredAt: new Date(PERIOD_END.getTime() + 1_000),
      currentPeriodEnd: PERIOD_END,
      eventId: `${RUN}-cancel-revoked`,
    });
    expect(revoked.body).toMatchObject({ outcome: "applied" });
    expect((await rowFor(email, "one-read")).status).toBe("EXPIRED");
  });

  it("past_due → recovered active, with the grace anchor cleared", async () => {
    const { email, base } = await activated("one-article", "dunning");

    await deliver({
      ...base,
      type: "subscription.past_due",
      status: "past_due",
      occurredAt: T_LATER,
      currentPeriodEnd: PERIOD_END,
      eventId: `${RUN}-dunning-pastdue`,
    });
    const pastDue = await rowFor(email, "one-article");
    expect(pastDue.status).toBe("PAST_DUE");
    expect(pastDue.pastDueAt).not.toBeNull();
    // Dunning is a grace window, not an instant cut-off.
    expect((await entitlementsFor(email, T_LATER)).byProduct["one-article"].granted).toBe(true);

    const recoveredAt = new Date(T_LATER.getTime() + 86_400_000);
    await deliver({
      ...base,
      type: "subscription.updated",
      status: "active",
      occurredAt: recoveredAt,
      currentPeriodEnd: PERIOD_END,
      eventId: `${RUN}-dunning-recovered`,
    });
    const recovered = await rowFor(email, "one-article");
    expect(recovered.status).toBe("ACTIVE_PAID");
    expect(recovered.pastDueAt).toBeNull();
    expect((await entitlementsFor(email, recoveredAt)).byProduct["one-article"].granted).toBe(true);
  });

  it("revocation expires access outright, and resubscribing restores it", async () => {
    const { email, base } = await activated("one-news", "revoke");

    await deliver({
      ...base,
      type: "subscription.revoked",
      status: "canceled",
      occurredAt: T_LATER,
      eventId: `${RUN}-revoke-revoked`,
    });
    const revoked = await rowFor(email, "one-news");
    expect(revoked.status).toBe("EXPIRED");
    expect((await entitlementsFor(email, T_LATER)).hasAnyAccess).toBe(false);

    const resubscribedAt = new Date(T_LATER.getTime() + 7 * 86_400_000);
    await deliver({
      ...base,
      type: "subscription.active",
      status: "active",
      occurredAt: resubscribedAt,
      currentPeriodEnd: new Date("2028-01-01T00:00:00Z"),
      eventId: `${RUN}-revoke-resubscribe`,
    });
    const resubscribed = await rowFor(email, "one-news");
    expect(resubscribed.status).toBe("ACTIVE_PAID");
    expect(resubscribed.offerKey).toBe("one-news");
    expect((await entitlementsFor(email, resubscribedAt)).byProduct["one-news"].granted).toBe(true);
  });
});
