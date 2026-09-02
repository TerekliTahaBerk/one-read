import type { Event, EventHint } from "@sentry/nextjs";

const SENSITIVE_KEY = /^(authorization|cookie|set-cookie|password|otp|code|token|secret|signature|request_body)$/i;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL_SECRET = /([?&](?:token|code|subscription|signature)=)[^&\s]+/gi;

function scrub(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) return "[Filtered]";
  if (typeof value === "string") {
    return value.replace(EMAIL, "[email]").replace(URL_SECRET, "$1[Filtered]");
  }
  if (Array.isArray(value)) return value.map((item) => scrub(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, scrub(child, childKey)]));
  }
  return value;
}

/** Shared Sentry hook for browser, server, and edge runtimes. */
export function beforeSendPrivacy<T extends Event>(event: T, _hint?: EventHint): T {
  const cleaned = scrub(event) as T;
  if (cleaned.request) {
    delete cleaned.request.data;
    if (cleaned.request.headers) {
      delete cleaned.request.headers.authorization;
      delete cleaned.request.headers.Authorization;
      delete cleaned.request.headers.cookie;
      delete cleaned.request.headers.Cookie;
    }
  }
  if (cleaned.user) delete cleaned.user.email;
  return cleaned;
}
