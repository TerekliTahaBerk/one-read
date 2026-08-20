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
