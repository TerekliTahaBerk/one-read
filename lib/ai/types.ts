/**
 * OneRead — shared AI provider types.
 *
 * These types are provider-agnostic on purpose: today the only implementation
 * is Gemini (`lib/ai/gemini.ts`), but every product brain (OneArticle,
 * OneLingo, OneFilm) talks to the SAME shared module. There is never
 * more than one Gemini implementation.
 */

/** Which model tier a task wants. Mapped to concrete model ids by env. */
export type GeminiModelTier = "fast" | "quality" | "reasoning";

/** Stable product identifiers used for logging + cache keys. */
export type AiProductKey = "one-article" | "one-lingo" | "one-film";

/** Coarse task name, for logging + per-task model selection. */
export type AiTask =
  | "article-brief"
  | "article-score"
  | "lingo-lesson"
  | "film-note";

export interface GeminiCallOptions {
  /** Product making the call — logged, never affects output. */
  product: AiProductKey;
  /** Task name — logged + used for default model selection. */
  task: AiTask;
  /** Model tier; resolved to a concrete model id via env. */
  tier?: GeminiModelTier;
  /** Explicit model id override (wins over tier). */
  model?: string;
  /** System instruction (role + rules). */
  system?: string;
  /** 0..1. Defaults to GEMINI_TEMPERATURE_DEFAULT. */
  temperature?: number;
  /** Defaults to GEMINI_MAX_OUTPUT_TOKENS. */
  maxOutputTokens?: number;
  /** Per-call timeout in ms. Defaults to GEMINI_TIMEOUT_MS. */
  timeoutMs?: number;
  /** Retry budget for transient errors. Defaults to GEMINI_MAX_RETRIES. */
  maxRetries?: number;
  /**
   * Deterministic mode for structured tasks: forces temperature 0 and a
   * fixed candidate, so the same input yields stable output (cache-friendly).
   */
  deterministic?: boolean;
  /** Prompt version string, stored on generation metadata for audit. */
  promptVersion?: string;
}

/** Token / cost metadata when the provider reports it. Never contains secrets. */
export interface AiUsage {
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface GeminiTextResult {
  ok: true;
  text: string;
  model: string;
  provider: "gemini";
  usage?: AiUsage;
  /** ms spent in the call (network + model). */
  latencyMs: number;
}

export interface GeminiJsonResult<T> {
  ok: true;
  data: T;
  /** Raw parsed JSON before schema validation (for debugging/admin). */
  raw: unknown;
  model: string;
  provider: "gemini";
  usage?: AiUsage;
  latencyMs: number;
  /** True when a repair retry was needed to get valid JSON. */
  repaired: boolean;
}

/** Classified error categories — never leak provider internals/secrets. */
export type AiErrorKind =
  | "missing_api_key"
  | "auth"
  | "rate_limit"
  | "quota"
  | "timeout"
  | "safety_blocked"
  | "invalid_request"
  | "invalid_json"
  | "empty_response"
  | "schema_validation"
  | "server_error"
  | "network"
  | "unknown";

export interface AiFailure {
  ok: false;
  kind: AiErrorKind;
  /** Safe, human-readable message. NEVER includes the API key. */
  message: string;
  /** True when retrying later might succeed. */
  retryable: boolean;
  model?: string;
  provider: "gemini";
  latencyMs?: number;
}

export type GeminiTextOutcome = GeminiTextResult | AiFailure;
export type GeminiJsonOutcome<T> = GeminiJsonResult<T> | AiFailure;

/** Provider status for the admin Settings page. Never reveals the key value. */
export interface GeminiProviderStatus {
  provider: "gemini";
  /** True when GEMINI_API_KEY is present (non-empty). */
  configured: boolean;
  /** Selected via AI_PROVIDER. */
  isActiveProvider: boolean;
  models: {
    fast: string;
    quality: string;
    reasoning: string;
  };
  temperatureDefault: number;
  maxOutputTokens: number;
}
