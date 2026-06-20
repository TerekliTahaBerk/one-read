/**
 * OneRead — shared AI layer barrel.
 *
 * All product brains import from "@/lib/ai". There is exactly one Gemini
 * implementation behind this barrel.
 */

export * from "./types";
export {
  generateTextWithGemini,
  generateJsonWithGemini,
  getGeminiProviderStatus,
  geminiConfigured,
  defaultTierForTask,
  __resetGeminiClientForTest,
} from "./gemini";
export {
  classifyGeminiError,
  aiFailure,
  failureFromError,
  sanitize,
  isRetryable,
} from "./errors";
export {
  extractJson,
  validateGeminiJson,
  repairOrRetryInvalidJson,
  type ValidationResult,
} from "./json";
export {
  stableHash,
  stableStringify,
  buildGenerationMeta,
  cacheHashMatches,
  type AiGenerationMeta,
} from "./cache";
export {
  runSharedGates,
  requireNonEmpty,
  toReport,
  collectStrings,
  isRealUrl,
  BANNED_PHRASES,
  type GateFinding,
  type GateReport,
  type GateSeverity,
  type SharedGateOptions,
} from "./quality";
