/**
 * Genuinely signed Polar webhook deliveries.
 *
 * The unit-level webhook matrix (lib/billing/polar-webhook-matrix.test.ts)
 * calls the state machine directly and the route test mocks `validateEvent`.
 * Neither of those proves the property the money flow actually depends on: that
 * a real Standard Webhooks signature over the exact bytes Polar sends is the
 * only thing that gets a payload into our database.
 *
 * So this fixture builds a payload complete enough to survive the Polar SDK's
 * own inbound schema, signs it with the shared secret exactly as Polar does,
 * and hands back a `Request` the route can be given unmodified. A payload built
 * here that the SDK later rejects is a real signal — it means the provider
 * changed the envelope we claim to understand.
 */

import { Webhook } from "standardwebhooks";

const ORG_ID = "org_test_oneread";

export const DEFAULT_WEBHOOK_SECRET = "whsec_money_flow_test";

/** Polar's own subscription statuses, as they arrive on the wire. */
export type PolarWireStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export interface PolarDeliveryOptions {
  /** Event type, e.g. "subscription.active". */
  type: string;
  /** Polar product id the event is for. */
  productId: string;
  /** Provider subscription id. Stable across an object's lifetime. */
  subscriptionId?: string;
  /** Provider customer id. */
  customerId?: string;
  customerEmail?: string;
  status?: PolarWireStatus;
  recurringInterval?: "month" | "year";
  /**
   * The point in the provider's timeline this event describes. Written to both
   * the envelope and `modified_at`, because the handler takes the newest of the
   * two — setting only one cannot produce a genuinely stale delivery.
   */
  occurredAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  endsAt?: Date | null;
  /** Checkout metadata. Omit `productSubscriptionId` to model a lost correlation. */
  metadata?: Record<string, string>;
  /** Unique delivery id. Reuse it to model a Polar redelivery. */
  eventId?: string;
  secret?: string;
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function priceOf(productId: string, interval: "month" | "year") {
  return {
    id: `price_${productId}`,
    created_at: "2026-01-01T00:00:00Z",
    modified_at: null,
    is_archived: false,
    product_id: productId,
    source: "catalog",
    type: "recurring",
    recurring_interval: interval,
    amount_type: "fixed",
    price_amount: interval === "year" ? 1800 : 200,
    price_currency: "usd",
    tax_behavior: "inclusive",
    legacy: false,
  };
}

/** The event body Polar would send, as a plain object. */
export function polarWebhookBody(options: PolarDeliveryOptions): Record<string, unknown> {
  const interval = options.recurringInterval ?? "year";
  const occurredAt = options.occurredAt ?? new Date("2026-06-01T00:00:00Z");
  const price = priceOf(options.productId, interval);

  const product = {
    id: options.productId,
    created_at: "2026-01-01T00:00:00Z",
    modified_at: null,
    name: "OneRead test offer",
    description: null,
    visibility: "public",
    recurring_interval: interval,
    recurring_interval_count: 1,
    trial_interval: null,
    trial_interval_count: null,
    is_recurring: true,
    is_archived: false,
    organization_id: ORG_ID,
    prices: [price],
    benefits: [],
    medias: [],
    attached_custom_fields: [],
    metadata: {},
  };

  const customer = {
    id: options.customerId ?? "polar_cus_test",
    created_at: "2026-01-01T00:00:00Z",
    modified_at: null,
    metadata: {},
    type: "individual",
    external_id: null,
    email: options.customerEmail ?? "reader@example.test",
    email_verified: true,
    name: null,
    billing_address: null,
    tax_id: null,
    organization_id: ORG_ID,
    deleted_at: null,
    avatar_url: "https://example.test/avatar.png",
  };

  return {
    type: options.type,
    timestamp: occurredAt.toISOString(),
    data: {
      id: options.subscriptionId ?? "polar_sub_test",
      created_at: "2026-01-01T00:00:00Z",
      modified_at: occurredAt.toISOString(),
      amount: price.price_amount,
      currency: "usd",
      recurring_interval: interval,
      recurring_interval_count: 1,
      status: options.status ?? "active",
      current_period_start: iso(options.currentPeriodStart ?? new Date("2026-06-01T00:00:00Z")),
      current_period_end: iso(options.currentPeriodEnd ?? new Date("2027-06-01T00:00:00Z")),
      cancel_at_period_end: options.cancelAtPeriodEnd ?? false,
      canceled_at: iso(options.canceledAt),
      started_at: "2026-06-01T00:00:00Z",
      ends_at: iso(options.endsAt),
      ended_at: null,
      customer_id: customer.id,
      product_id: options.productId,
      discount_id: null,
      checkout_id: null,
      customer_cancellation_reason: null,
      customer_cancellation_comment: null,
      trial_start: null,
      trial_end: null,
      pending_update: null,
      metadata: options.metadata ?? {},
      custom_field_data: {},
      price,
      prices: [price],
      meters: [],
      seats: null,
      customer,
      product,
      discount: null,
    },
  };
}

/**
 * A `Request` carrying a real Standard Webhooks signature over the exact body
 * bytes — the same construction Polar performs, so the route's verification
 * runs for real.
 */
export function signedPolarDelivery(options: PolarDeliveryOptions): Request {
  const secret = options.secret ?? DEFAULT_WEBHOOK_SECRET;
  const body = JSON.stringify(polarWebhookBody(options));
  const eventId = options.eventId ?? `evt_${Math.random().toString(36).slice(2)}`;
  const signedAt = new Date();

  const webhook = new Webhook(Buffer.from(secret, "utf-8").toString("base64"));
  return new Request("https://oneread.email/api/webhook/polar", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "webhook-id": eventId,
      "webhook-timestamp": String(Math.floor(signedAt.getTime() / 1000)),
      "webhook-signature": webhook.sign(eventId, signedAt, body),
    },
  });
}

/**
 * The same delivery with a signature that does not match the body. Signed with
 * a different secret rather than by corrupting the header, so what is under
 * test is verification and not header parsing.
 */
export function forgedPolarDelivery(options: PolarDeliveryOptions): Request {
  return signedPolarDelivery({ ...options, secret: "whsec_not_our_secret" });
}
