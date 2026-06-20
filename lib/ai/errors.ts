/**
 * OneRead — Gemini error classification.
 *
 * Turns any thrown error / bad response into a safe, classified `AiFailure`.
 * CRITICAL: messages here must never include the API key or raw secrets. We
 * deliberately build our own message rather than echoing provider payloads.
 */

import type { AiErrorKind, AiFailure } from "./types";

/** Errors worth retrying with backoff. */
const RETRYABLE: ReadonlySet<AiErrorKind> = new Set([
  "rate_limit",
  "timeout",
  "server_error",
  "network",
  "empty_response",
  "invalid_json",
]);

export function isRetryable(kind: AiErrorKind): boolean {
  return RETRYABLE.has(kind);
}

/**
 * Classify an arbitrary error from the Gemini SDK into a stable kind.
 * Only the kind + a generic message are surfaced — never the underlying
 * exception text (which could echo headers / keys).
 */
export function classifyGeminiError(err: unknown): AiErrorKind {
  const status = extractStatus(err);
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status === 408) return "timeout";
  if (status === 400) return "invalid_request";
  if (typeof status === "number" && status >= 500) return "server_error";

  const msg = (errText(err) || "").toLowerCase();
  if (msg.includes("api key") || msg.includes("api_key") || msg.includes("unauthenticated"))
    return "auth";
  if (msg.includes("quota") || msg.includes("exhausted")) return "quota";
  if (msg.includes("rate") && msg.includes("limit")) return "rate_limit";
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("aborted"))
    return "timeout";
  if (msg.includes("safety") || msg.includes("blocked") || msg.includes("recitation"))
    return "safety_blocked";
  if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("econn"))
    return "network";
  return "unknown";
}

/** Build a safe AiFailure. The message is sanitized of any key-like tokens. */
export function aiFailure(
  kind: AiErrorKind,
  message: string,
  opts: { model?: string; latencyMs?: number } = {},
): AiFailure {
  return {
    ok: false,
    kind,
    message: sanitize(message),
    retryable: isRetryable(kind),
    provider: "gemini",
    model: opts.model,
    latencyMs: opts.latencyMs,
  };
}

/** Convenience: classify + wrap a thrown error in one step. */
export function failureFromError(
  err: unknown,
  opts: { model?: string; latencyMs?: number } = {},
): AiFailure {
  const kind = classifyGeminiError(err);
  return aiFailure(kind, friendlyMessage(kind), opts);
}

function friendlyMessage(kind: AiErrorKind): string {
  switch (kind) {
    case "missing_api_key":
      return "GEMINI_API_KEY is not configured.";
    case "auth":
      return "Gemini rejected the request (authentication).";
    case "rate_limit":
      return "Gemini rate limit hit — retry later.";
    case "quota":
      return "Gemini quota exhausted.";
    case "timeout":
      return "Gemini request timed out.";
    case "safety_blocked":
      return "Gemini blocked the response on safety grounds.";
    case "invalid_request":
      return "Gemini rejected the request as invalid.";
    case "invalid_json":
      return "Gemini returned content that was not valid JSON.";
    case "empty_response":
      return "Gemini returned an empty response.";
    case "schema_validation":
      return "Gemini output failed schema validation.";
    case "server_error":
      return "Gemini had a server error.";
    case "network":
      return "Network error reaching Gemini.";
    default:
      return "Unknown Gemini error.";
  }
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

function extractStatus(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const anyErr = err as Record<string, unknown>;
    for (const k of ["status", "statusCode", "code"]) {
      const v = anyErr[k];
      if (typeof v === "number") return v;
      if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    }
  }
  return undefined;
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Defensive scrub: strip anything that looks like a Google API key
 * (AIza...) or a long bearer token from a message before it is logged or
 * shown in admin.
 */
export function sanitize(message: string): string {
  return (message || "")
    .replace(/AIza[0-9A-Za-z_\-]{10,}/g, "[redacted-key]")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]")
    .replace(/key=[^&\s]+/gi, "key=[redacted]");
}
