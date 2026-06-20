/**
 * OneRead — AI generation cache helpers.
 *
 * The DB already enforces idempotency per product (unique constraints on
 * Summary, LingoDailyLesson, NewsDailyIssue, FilmDailyIssue). This module adds
 * the *content-level* cache identity: a stable hash of the inputs + prompt
 * version + model, so we can detect when a cached record is stale (the source
 * changed) and store provenance for audit.
 *
 * These helpers never call the model. They are pure + deterministic.
 */

import { createHash } from "node:crypto";

/** Stable SHA-256 (hex, 16-char prefix) of any JSON-serializable value. */
export function stableHash(value: unknown): string {
  const json = stableStringify(value);
  return createHash("sha256").update(json).digest("hex").slice(0, 16);
}

/** Deterministic JSON.stringify with sorted object keys. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = sortKeys(obj[key]);
    return out;
  }
  return value;
}

/**
 * Shared provenance written into each product's `generationMetadata` Json (or
 * Summary fields). Lets the admin see exactly what produced a record and lets
 * us decide whether a cached record is still valid.
 */
export interface AiGenerationMeta {
  provider: string | null;
  model: string | null;
  promptVersion: string | null;
  /** Hash of the inputs that determine the output (source text, segment, etc). */
  inputHash: string;
  /** "ai" | "deterministic" | "heuristic" | "none" */
  source: string;
  /** "VALID" | "INVALID" | "SKIPPED" */
  validationStatus: "VALID" | "INVALID" | "SKIPPED";
  /** Quality-gate / schema warnings (safe to show admin). */
  warnings?: string[];
  /** Whether a repair retry was needed. */
  repaired?: boolean;
  generatedAt: string;
  /** Present only when generation failed. */
  error?: string;
}

/** Build a metadata record with sensible defaults. */
export function buildGenerationMeta(
  partial: Partial<AiGenerationMeta> & { inputHash: string; source: string },
): AiGenerationMeta {
  return {
    provider: partial.provider ?? null,
    model: partial.model ?? null,
    promptVersion: partial.promptVersion ?? null,
    inputHash: partial.inputHash,
    source: partial.source,
    validationStatus: partial.validationStatus ?? "SKIPPED",
    warnings: partial.warnings && partial.warnings.length ? partial.warnings : undefined,
    repaired: partial.repaired,
    generatedAt: partial.generatedAt ?? new Date().toISOString(),
    error: partial.error,
  };
}

/**
 * True when a cached record's stored inputHash still matches freshly computed
 * inputs. Callers use this to decide reuse vs. (admin-triggered) regenerate.
 */
export function cacheHashMatches(
  storedMeta: unknown,
  freshInputHash: string,
): boolean {
  if (!storedMeta || typeof storedMeta !== "object") return false;
  const h = (storedMeta as Record<string, unknown>).inputHash;
  return typeof h === "string" && h === freshInputHash;
}
