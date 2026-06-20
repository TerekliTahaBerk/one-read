/**
 * OneRead — JSON extraction + validation helpers for AI output.
 *
 * The pipeline NEVER trusts raw model text. Flow:
 *   1. extractJson()       — tolerant parse (strips code fences, finds object)
 *   2. validateGeminiJson()— Zod-validate against a product schema
 *   3. repairOrRetryInvalidJson() — one corrective retry on failure
 *
 * Validation uses Zod (already a dependency). Schemas live next to each
 * product brain; this module is schema-agnostic.
 */

import type { z } from "zod";

/**
 * Tolerant JSON parse. Handles:
 *  - ```json fenced blocks
 *  - leading/trailing prose around a single object
 * Returns null when nothing parseable is found.
 */
export function extractJson(text: string): unknown | null {
  if (!text) return null;
  const trimmed = text.trim();

  // 1. Strip a single fenced code block if present.
  const fenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const direct = tryParse(fenced);
  if (direct !== undefined) return direct;

  // 2. Fall back to the first {...} or [...] span.
  const objSpan = sliceBalanced(fenced, "{", "}");
  if (objSpan) {
    const parsed = tryParse(objSpan);
    if (parsed !== undefined) return parsed;
  }
  const arrSpan = sliceBalanced(fenced, "[", "]");
  if (arrSpan) {
    const parsed = tryParse(arrSpan);
    if (parsed !== undefined) return parsed;
  }
  return null;
}

function tryParse(s: string): unknown | undefined {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Returns the smallest balanced span from the first opener to its match. */
function sliceBalanced(s: string, open: string, close: string): string | null {
  const start = s.indexOf(open);
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  /** Compact list of validation issues (path: message). Safe to show admin. */
  issues: string[];
}

/** Validate already-parsed JSON against a Zod schema. */
export function validateGeminiJson<T>(
  raw: unknown,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
): ValidationResult<T> {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data, issues: [] };
  const issues = result.error.issues
    .slice(0, 12)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
  return { ok: false, issues };
}

/**
 * One corrective retry: given the original prompt + validation issues, ask the
 * caller's `regenerate` fn for a fresh response, then re-validate. Keeps the
 * retry policy in one place so every product behaves identically.
 *
 * `regenerate(correction)` should re-run the model call, appending `correction`
 * to the user prompt. Returns the raw model text.
 */
export async function repairOrRetryInvalidJson<T>(
  firstText: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  regenerate: (correction: string) => Promise<string>,
): Promise<{ data?: T; raw: unknown; repaired: boolean; issues: string[] }> {
  const firstRaw = extractJson(firstText);
  if (firstRaw !== null) {
    const v = validateGeminiJson(firstRaw, schema);
    if (v.ok) return { data: v.data, raw: firstRaw, repaired: false, issues: [] };
    // Try one repair pass with the specific issues.
    const correction = buildCorrection(v.issues);
    const retryText = await regenerate(correction);
    const retryRaw = extractJson(retryText);
    if (retryRaw !== null) {
      const v2 = validateGeminiJson(retryRaw, schema);
      if (v2.ok) return { data: v2.data, raw: retryRaw, repaired: true, issues: [] };
      return { raw: retryRaw, repaired: true, issues: v2.issues };
    }
    return { raw: null, repaired: true, issues: ["retry produced unparseable JSON"] };
  }

  // First response wasn't even parseable — retry asking for JSON only.
  const retryText = await regenerate(
    "Your previous output was not valid JSON. Return ONE JSON object only — no prose, no markdown, no code fences.",
  );
  const retryRaw = extractJson(retryText);
  if (retryRaw === null) {
    return { raw: null, repaired: true, issues: ["unparseable JSON after retry"] };
  }
  const v = validateGeminiJson(retryRaw, schema);
  if (v.ok) return { data: v.data, raw: retryRaw, repaired: true, issues: [] };
  return { raw: retryRaw, repaired: true, issues: v.issues };
}

function buildCorrection(issues: string[]): string {
  const list = issues.map((i) => `- ${i}`).join("\n");
  return `Your previous JSON failed validation. Fix exactly these problems and return the full corrected JSON object only (no prose, no fences):\n${list}`;
}
