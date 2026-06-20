/**
 * OneRead — shared Gemini provider.
 *
 * THE single Gemini implementation for the whole app. Every product brain
 * (OneArticle, OneLingo, OneNews, OneFilm) calls `generateTextWithGemini` /
 * `generateJsonWithGemini` here — there are never four separate Gemini clients.
 *
 * Safety:
 *  - The API key is read from GEMINI_API_KEY and never logged or returned.
 *  - All errors are classified into safe `AiFailure` shapes (see errors.ts).
 *  - JSON tasks use responseMimeType=application/json + Zod validation +
 *    a single repair retry.
 *  - Deterministic mode (temperature 0) for structured tasks → stable, cacheable.
 *
 * Model selection is per-task via env (GEMINI_MODEL_FAST/QUALITY/REASONING)
 * with safe defaults — nothing is hardcoded at call sites.
 */

import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { failureFromError, aiFailure, sanitize } from "./errors";
import { repairOrRetryInvalidJson } from "./json";
import type {
  AiUsage,
  GeminiCallOptions,
  GeminiJsonOutcome,
  GeminiModelTier,
  GeminiProviderStatus,
  GeminiTextOutcome,
} from "./types";

/* ----------------------------------------------------------------------- */
/* Config                                                                   */
/* ----------------------------------------------------------------------- */

const DEFAULT_MODELS: Record<GeminiModelTier, string> = {
  // gemini-2.5-flash is the reliable default across tiers: gemini-2.5-pro is
  // rate-limited / unavailable on the current API key tier. Override per tier
  // with GEMINI_MODEL_FAST / GEMINI_MODEL_QUALITY / GEMINI_MODEL_REASONING once
  // a pro-capable key is in place.
  fast: "gemini-2.5-flash",
  quality: "gemini-2.5-flash",
  reasoning: "gemini-2.5-flash",
};

function modelForTier(tier: GeminiModelTier): string {
  const env =
    tier === "fast"
      ? process.env.GEMINI_MODEL_FAST
      : tier === "quality"
        ? process.env.GEMINI_MODEL_QUALITY
        : process.env.GEMINI_MODEL_REASONING;
  return (env && env.trim()) || DEFAULT_MODELS[tier];
}

function defaultTemperature(): number {
  const n = Number(process.env.GEMINI_TEMPERATURE_DEFAULT);
  return Number.isFinite(n) ? clamp(n, 0, 2) : 0.4;
}

function defaultMaxTokens(): number {
  const n = Number(process.env.GEMINI_MAX_OUTPUT_TOKENS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 4096;
}

function defaultTimeoutMs(): number {
  const n = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 45_000;
}

function defaultMaxRetries(): number {
  const n = Number(process.env.GEMINI_MAX_RETRIES);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 2;
}

export function geminiConfigured(): boolean {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

/** Status for the admin Settings page. Never reveals the key value. */
export function getGeminiProviderStatus(): GeminiProviderStatus {
  return {
    provider: "gemini",
    configured: geminiConfigured(),
    isActiveProvider: (process.env.AI_PROVIDER || "").toLowerCase() === "gemini",
    models: {
      fast: modelForTier("fast"),
      quality: modelForTier("quality"),
      reasoning: modelForTier("reasoning"),
    },
    temperatureDefault: defaultTemperature(),
    maxOutputTokens: defaultMaxTokens(),
  };
}

/* ----------------------------------------------------------------------- */
/* Client (lazy singleton)                                                  */
/* ----------------------------------------------------------------------- */

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!geminiConfigured()) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return cachedClient;
}

/** Test seam. */
export function __resetGeminiClientForTest() {
  cachedClient = null;
}

function resolveModel(opts: GeminiCallOptions): string {
  if (opts.model && opts.model.trim()) return opts.model.trim();
  return modelForTier(opts.tier ?? "quality");
}

/** Default model tier per task — fast for classification, quality for content. */
export function defaultTierForTask(task: GeminiCallOptions["task"]): GeminiModelTier {
  return task === "article-score" ? "fast" : "quality";
}

/* ----------------------------------------------------------------------- */
/* Low-level call                                                           */
/* ----------------------------------------------------------------------- */

interface RawCall {
  text: string;
  model: string;
  usage?: AiUsage;
  latencyMs: number;
}

async function rawGenerate(
  prompt: string,
  opts: GeminiCallOptions,
  jsonMode: boolean,
): Promise<RawCall> {
  const client = getClient();
  if (!client) {
    throw Object.assign(new Error("missing_api_key"), { kind: "missing_api_key" });
  }
  const model = resolveModel(opts);
  const temperature = opts.deterministic
    ? 0
    : opts.temperature ?? defaultTemperature();
  const timeoutMs = opts.timeoutMs ?? defaultTimeoutMs();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(opts.system ? { systemInstruction: opts.system } : {}),
        temperature,
        maxOutputTokens: opts.maxOutputTokens ?? defaultMaxTokens(),
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
        abortSignal: controller.signal,
      },
    });
    const latencyMs = Date.now() - t0;
    const text = (response.text ?? "").trim();
    const usage = mapUsage(response.usageMetadata);
    return { text, model, usage, latencyMs };
  } finally {
    clearTimeout(timer);
  }
}

function mapUsage(meta: unknown): AiUsage | undefined {
  if (!meta || typeof meta !== "object") return undefined;
  const m = meta as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  const usage: AiUsage = {
    promptTokens: num(m.promptTokenCount),
    outputTokens: num(m.candidatesTokenCount),
    totalTokens: num(m.totalTokenCount),
  };
  return usage.totalTokens || usage.promptTokens || usage.outputTokens
    ? usage
    : undefined;
}

/** Logs a one-line, secret-free record of each call. */
function logCall(
  opts: GeminiCallOptions,
  model: string,
  status: string,
  latencyMs: number,
  usage?: AiUsage,
) {
  const tokens = usage?.totalTokens != null ? ` tokens=${usage.totalTokens}` : "";
  console.log(
    `[ai/gemini] ${opts.product}/${opts.task} model=${model} status=${status} ${latencyMs}ms${tokens}` +
      (opts.promptVersion ? ` prompt=${opts.promptVersion}` : ""),
  );
}

/* ----------------------------------------------------------------------- */
/* Public: plain text                                                       */
/* ----------------------------------------------------------------------- */

export async function generateTextWithGemini(
  prompt: string,
  opts: GeminiCallOptions,
): Promise<GeminiTextOutcome> {
  if (!geminiConfigured()) {
    return aiFailure("missing_api_key", "GEMINI_API_KEY is not configured.");
  }
  const maxRetries = opts.maxRetries ?? defaultMaxRetries();
  let attempt = 0;
  let lastFailure = aiFailure("unknown", "no attempt made");
  while (attempt <= maxRetries) {
    try {
      const r = await rawGenerate(prompt, opts, false);
      if (!r.text) {
        lastFailure = aiFailure("empty_response", "Gemini returned empty text.", {
          model: r.model,
          latencyMs: r.latencyMs,
        });
        logCall(opts, r.model, "empty", r.latencyMs, r.usage);
      } else {
        logCall(opts, r.model, "ok", r.latencyMs, r.usage);
        return {
          ok: true,
          text: r.text,
          model: r.model,
          provider: "gemini",
          usage: r.usage,
          latencyMs: r.latencyMs,
        };
      }
    } catch (err) {
      lastFailure = failureFromError(err, { model: resolveModel(opts) });
      logCall(opts, resolveModel(opts), `err:${lastFailure.kind}`, 0);
    }
    if (!lastFailure.retryable) break;
    attempt++;
    if (attempt <= maxRetries) await backoff(attempt);
  }
  return lastFailure;
}

/* ----------------------------------------------------------------------- */
/* Public: structured JSON                                                  */
/* ----------------------------------------------------------------------- */

/**
 * Generate + validate JSON against a Zod schema, with one repair retry. Uses
 * deterministic mode by default for structured tasks (stable, cacheable).
 */
export async function generateJsonWithGemini<T>(
  prompt: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  opts: GeminiCallOptions,
): Promise<GeminiJsonOutcome<T>> {
  if (!geminiConfigured()) {
    return aiFailure("missing_api_key", "GEMINI_API_KEY is not configured.");
  }

  const jsonOpts: GeminiCallOptions = {
    deterministic: true,
    ...opts,
  };

  // First call (with transient-error retries handled inside).
  const first = await callJsonOnce(prompt, jsonOpts);
  if (!first.ok) return first;

  const { data, raw, repaired, issues } = await repairOrRetryInvalidJson(
    first.text,
    schema,
    async (correction) => {
      const retry = await callJsonOnce(`${prompt}\n\n${correction}`, jsonOpts);
      return retry.ok ? retry.text : "";
    },
  );

  if (data === undefined) {
    return aiFailure(
      "schema_validation",
      `Output failed schema validation: ${issues.join("; ")}`,
      { model: first.model, latencyMs: first.latencyMs },
    );
  }

  return {
    ok: true,
    data,
    raw,
    model: first.model,
    provider: "gemini",
    usage: first.usage,
    latencyMs: first.latencyMs,
    repaired,
  };
}

interface JsonOnce {
  ok: true;
  text: string;
  model: string;
  usage?: AiUsage;
  latencyMs: number;
}

async function callJsonOnce(
  prompt: string,
  opts: GeminiCallOptions,
): Promise<JsonOnce | (ReturnType<typeof aiFailure> & { ok: false })> {
  const maxRetries = opts.maxRetries ?? defaultMaxRetries();
  let attempt = 0;
  let lastFailure = aiFailure("unknown", "no attempt made");
  while (attempt <= maxRetries) {
    try {
      const r = await rawGenerate(prompt, opts, true);
      if (!r.text) {
        lastFailure = aiFailure("empty_response", "Gemini returned empty JSON.", {
          model: r.model,
          latencyMs: r.latencyMs,
        });
        logCall(opts, r.model, "empty", r.latencyMs, r.usage);
      } else {
        logCall(opts, r.model, "ok", r.latencyMs, r.usage);
        return { ok: true, text: r.text, model: r.model, usage: r.usage, latencyMs: r.latencyMs };
      }
    } catch (err) {
      lastFailure = failureFromError(err, { model: resolveModel(opts) });
      logCall(opts, resolveModel(opts), `err:${lastFailure.kind}`, 0);
    }
    if (!lastFailure.retryable) break;
    attempt++;
    if (attempt <= maxRetries) await backoff(attempt);
  }
  return lastFailure;
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

async function backoff(attempt: number): Promise<void> {
  // Exponential backoff with jitter: ~0.5s, 1s, 2s ...
  const base = 500 * 2 ** (attempt - 1);
  const jitter = Math.random() * 250;
  await new Promise((r) => setTimeout(r, base + jitter));
}

/** Re-export so callers can scrub their own strings before logging. */
export { sanitize };
