import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE_SECONDS = 5 * 60;

function decodeSecret(secret: string): Buffer {
  const value = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  return Buffer.from(value, "base64");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Verifies Resend's Standard Webhooks signature against the raw body. */
export function verifyResendWebhook(args: {
  body: string;
  headers: Headers;
  secret: string;
  now?: Date;
}): boolean {
  const id = args.headers.get("webhook-id");
  const timestamp = args.headers.get("webhook-timestamp");
  const signatures = args.headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;

  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds)) return false;
  const nowSeconds = Math.floor((args.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - seconds) > MAX_AGE_SECONDS) return false;

  let expected: string;
  try {
    expected = createHmac("sha256", decodeSecret(args.secret))
      .update(`${id}.${timestamp}.${args.body}`)
      .digest("base64");
  } catch {
    return false;
  }

  return signatures.split(" ").some((item) => {
    const [version, signature] = item.split(",");
    return version === "v1" && Boolean(signature) && safeEqual(signature, expected);
  });
}

export function resendEventRecipients(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as { data?: unknown }).data;
  if (!data || typeof data !== "object") return [];
  const raw = (data as { to?: unknown }).to;
  const values = Array.isArray(raw) ? raw : [raw];
  return [...new Set(values.filter((value): value is string => typeof value === "string").map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export const RESEND_PROVIDER_STATUSES = [
  "ACCEPTED", "DELIVERED", "DELAYED", "FAILED", "BOUNCED", "COMPLAINED",
] as const;
export type ResendProviderStatus = (typeof RESEND_PROVIDER_STATUSES)[number];

const EVENT_STATUS: Record<string, ResendProviderStatus> = {
  "email.sent": "ACCEPTED",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DELAYED",
  "email.failed": "FAILED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
};

export type ResendDeliveryEvent = {
  type: string;
  status: ResendProviderStatus;
  messageId: string | null;
  occurredAt: Date;
  recipients: string[];
};

/** Extract only operational fields; callers never persist or log the raw body. */
export function parseResendDeliveryEvent(payload: unknown, fallback = new Date()): ResendDeliveryEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { type?: unknown; created_at?: unknown; data?: unknown };
  if (typeof record.type !== "string") return null;
  const status = EVENT_STATUS[record.type];
  if (!status) return null;
  const data = record.data && typeof record.data === "object"
    ? record.data as { email_id?: unknown; id?: unknown; created_at?: unknown }
    : {};
  const rawId = typeof data.email_id === "string" ? data.email_id : data.id;
  const rawTime = typeof record.created_at === "string" ? record.created_at : data.created_at;
  const occurredAt = typeof rawTime === "string" ? new Date(rawTime) : fallback;
  return {
    type: record.type,
    status,
    messageId: typeof rawId === "string" && rawId.trim() ? rawId.trim() : null,
    occurredAt: Number.isFinite(occurredAt.getTime()) ? occurredAt : fallback,
    recipients: resendEventRecipients(payload),
  };
}

const TERMINAL = new Set<ResendProviderStatus>(["DELIVERED", "FAILED", "BOUNCED", "COMPLAINED"]);

/** Prevent duplicate/reordered webhooks from regressing a newer terminal result. */
export function shouldApplyProviderEvent(
  current: { providerStatus: string | null; providerStatusAt: Date | null },
  incoming: Pick<ResendDeliveryEvent, "status" | "occurredAt">,
): boolean {
  if (current.providerStatusAt && incoming.occurredAt < current.providerStatusAt) return false;
  if (current.providerStatusAt?.getTime() === incoming.occurredAt.getTime() && current.providerStatus === incoming.status) return false;
  // A terminal outcome is the final word: a late DELAYED (or a repeat of a
  // different terminal event) must not overwrite a confirmed delivery.
  if (current.providerStatus && TERMINAL.has(current.providerStatus as ResendProviderStatus)) {
    return false;
  }
  return true;
}
