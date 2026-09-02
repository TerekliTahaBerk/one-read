import { NextResponse } from "next/server";
import {
  parseEmail,
  ONE_READ_PRODUCT_KEY,
  ONE_ARTICLE_PRODUCT_KEY,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";
import {
  resolveOneReadState,
  resolveOneArticleEligibilityForContact,
} from "@/lib/oneread/access";
import { preferencesComplete } from "@/lib/subscriptions";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { reconcileOneReadBillingFromPolar } from "@/lib/oneread/billing-sync";
import {
  presentBilling,
  type PresentableSubscription,
} from "@/lib/billing/presentation";
import { GRANDFATHER_FORFEIT_WARNING } from "@/lib/billing/transitions";
import { resolveEntitlements } from "@/lib/products/entitlements";
import { PRODUCT_ONE_ARTICLE, PRODUCT_ONE_NEWS } from "@/lib/products/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/lookup
 * Body: { email: string }
 *
 * Read-only status lookup for the /preferences page. Mirrors the existing
 * per-product subscribe-lookup routes — returns only non-sensitive state
 * (no billing/provider identifiers).
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = parseEmail(payload.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }
  if (!hasVerifiedEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }

  await reconcileOneReadBillingFromPolar(email);
  const state = await resolveOneReadState(email);

  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: {
        where: {
          productKey: {
            in: [
              ONE_READ_PRODUCT_KEY,
              ONE_ARTICLE_PRODUCT_KEY,
              PRODUCT_ONE_NEWS,
            ],
          },
        },
        include: { preferences: true },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({
      ok: true,
      ...state,
      articlePreferencesComplete: false,
    });
  }

  const articleHolder = contact.subscriptions.find((s) => s.productKey === ONE_ARTICLE_PRODUCT_KEY);
  const articleEligibility = await resolveOneArticleEligibilityForContact(contact.id);
  const newsHolder = contact.subscriptions.find((s) => s.productKey === PRODUCT_ONE_NEWS);
  const entitlements = resolveEntitlements(contact.subscriptions);
  const language = articleHolder?.preferences?.summaryLanguage ?? null;

  return NextResponse.json({
    ok: true,
    ...state,
    articlePreferencesComplete: preferencesComplete(articleHolder?.preferences ?? null),
    articleEligibilityReason: articleEligibility.reason,
    products: {
      [PRODUCT_ONE_ARTICLE]: {
        active: entitlements.byProduct[PRODUCT_ONE_ARTICLE].granted,
        cadence: "Weekdays · Morning",
        language,
        emailStatus: articleHolder?.emailDeliveryStatus ?? "UNSUBSCRIBED",
      },
      [PRODUCT_ONE_NEWS]: {
        active: entitlements.byProduct[PRODUCT_ONE_NEWS].granted,
        cadence: "Mon / Wed / Fri",
        language,
        emailStatus: newsHolder?.emailDeliveryStatus ?? "UNSUBSCRIBED",
      },
    },
    billingManageable: contact.subscriptions.some(
      (subscription) => subscription.paymentProvider === "polar" &&
        Boolean(subscription.providerCustomerId || subscription.providerSubscriptionId),
    ),
    billing: await describeBillingForSubscriber(contact.subscriptions),
  });
}

/**
 * Accurate billing state for My OneRead.
 *
 * Deliberately describes what the subscriber actually bought rather than what
 * the row's `productKey` looks like: a grandfathered $1 plan reports itself as
 * a legacy plan granting OneArticle, never as the current OneRead bundle. The
 * grandfathering warning travels with it so any upgrade affordance can show the
 * consequence before the subscriber commits to it.
 */
async function describeBillingForSubscriber(
  subscriptions: (PresentableSubscription & { id: string })[],
) {
  const billable = subscriptions.filter(
    (subscription) => subscription.status !== "PENDING_PREFERENCES",
  );
  if (billable.length === 0) return null;

  const pending = await prisma.subscriptionTransition.findMany({
    where: { subscriptionId: { in: billable.map((s) => s.id) }, state: "PENDING_PROVIDER" },
    select: { subscriptionId: true, toOfferKey: true, toInterval: true },
  });
  const pendingBySubscription = new Map(pending.map((row) => [row.subscriptionId, row]));

  const plans = billable.map((subscription) => {
    const change = pendingBySubscription.get(subscription.id);
    const presented = presentBilling(subscription, {
      hasPendingChange: Boolean(change),
    });
    return {
      plan: presented.offerLabel,
      includes: presented.grantsLabel,
      billing: presented.intervalLabel,
      state: presented.lifecycle,
      grandfathered: presented.grandfathered,
      pendingChange: change
        ? { toOffer: change.toOfferKey, toInterval: change.toInterval }
        : null,
    };
  });

  return {
    plans,
    grandfathered: plans.some((plan) => plan.grandfathered),
    // Shown before any plan change, so the consequence is never a surprise.
    grandfatherWarning: plans.some((plan) => plan.grandfathered)
      ? GRANDFATHER_FORFEIT_WARNING
      : null,
  };
}
