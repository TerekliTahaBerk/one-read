/**
 * OneRead — LLM provider factory.
 *
 * `getLlmProvider()` reads `AI_PROVIDER` and returns the configured
 * provider. Returns `null` if no provider is configured, which lets
 * callers fall back to heuristic logic in development.
 *
 * Production deployments MUST set `AI_PROVIDER` to "openai" or "anthropic"
 * and provide the corresponding API key. When that is missing in
 * production we log a loud error so the cron logs make the misconfig
 * obvious — the heuristic provider is never silently used in prod.
 */

import type { LlmProvider } from "./types";
import { createOpenAiProvider } from "./openai";
import { createAnthropicProvider } from "./anthropic";
import { createGeminiProvider } from "./gemini";
import { getGeminiProviderStatus, geminiConfigured } from "@/lib/ai";

let cached: LlmProvider | null | undefined;
let warnedMissingProvider = false;

export function getLlmProvider(): LlmProvider | null {
  if (cached !== undefined) return cached;

  const provider = (process.env.AI_PROVIDER || "").toLowerCase();
  const isProd = process.env.NODE_ENV === "production";

  if (!provider || provider === "none" || provider === "off") {
    if (isProd && !warnedMissingProvider) {
      warnedMissingProvider = true;
      console.error(
        "[llm] AI_PROVIDER is not set in production. Summaries will fall back to the heuristic provider and will NOT be marked READY. Set AI_PROVIDER=gemini (recommended), openai, or anthropic.",
      );
    }
    cached = null;
    return null;
  }

  try {
    if (provider === "gemini") {
      cached = createGeminiProvider();
      return cached;
    }
    if (provider === "openai") {
      cached = createOpenAiProvider();
      return cached;
    }
    if (provider === "anthropic") {
      cached = createAnthropicProvider();
      return cached;
    }
    console.warn(
      `[llm] unknown AI_PROVIDER="${provider}" — falling back to heuristic.`,
    );
  } catch (err) {
    console.error(
      "[llm] failed to construct provider:",
      err instanceof Error ? err.message : err,
    );
  }

  cached = null;
  return null;
}

/**
 * Lightweight observability snapshot for the admin page. Does NOT leak
 * the API key — only reports whether one is configured.
 */
export function getLlmStatus(): {
  provider: string;
  model: string;
  configured: boolean;
  hasGeminiKey: boolean;
  hasOpenAiKey: boolean;
  hasAnthropicKey: boolean;
  gemini: ReturnType<typeof getGeminiProviderStatus>;
} {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase() || "none";
  const model =
    provider === "gemini"
      ? getGeminiProviderStatus().models.quality
      : process.env.AI_MODEL || defaultModelFor(provider);
  return {
    provider,
    model,
    configured: getLlmProvider() !== null,
    hasGeminiKey: geminiConfigured(),
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    gemini: getGeminiProviderStatus(),
  };
}

function defaultModelFor(provider: string): string {
  if (provider === "gemini") return getGeminiProviderStatus().models.quality;
  if (provider === "openai") return "gpt-4o-mini";
  if (provider === "anthropic") return "claude-3-5-haiku-latest";
  return "—";
}

export type { LlmProvider } from "./types";
export type {
  ScoreRequest,
  StructuredScore,
  StructuredSummary,
  SummarizeRequest,
} from "./types";

/** Test seam: lets unit tests reset the cached provider between cases. */
export function __resetLlmProviderForTest() {
  cached = undefined;
  warnedMissingProvider = false;
}
