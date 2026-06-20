/**
 * OneRead — shared AI quality gates.
 *
 * After schema validation, every AI output passes through these gates before it
 * can be marked sendable. Gates are advisory-by-severity:
 *   - "error"   → output is NOT safe to send (mark failed / needs review)
 *   - "warning" → surfaced in admin, still sendable
 *
 * Gates are pure functions over already-parsed/validated content. They never
 * call the model. Product-specific gates compose the shared ones.
 */

export type GateSeverity = "error" | "warning";

export interface GateFinding {
  severity: GateSeverity;
  code: string;
  message: string;
  /** Where it was found (field path / section), if known. */
  field?: string;
}

export interface GateReport {
  ok: boolean; // false when any "error" finding exists
  findings: GateFinding[];
  /** Convenience: human-readable warning strings (errors + warnings). */
  warnings: string[];
}

/* ----------------------------------------------------------------------- */
/* Banned phrases (Phase 9)                                                  */
/* ----------------------------------------------------------------------- */

/** Case-insensitive banned marketing / AI-slop phrases. */
export const BANNED_PHRASES: readonly string[] = [
  "in today's fast-paced world",
  "in todays fast-paced world",
  "unlock",
  "supercharge",
  "revolutionary",
  "game-changing",
  "game changing",
  "ai-powered",
  "ai powered",
  "seamless",
  "delve",
  "dive into",
  "embark",
  "tailored just for you",
  "curated content experience",
  "as an ai",
  "as a language model",
  "as an ai language model",
];

/** Placeholder / leakage markers that must never reach an email. */
const PLACEHOLDER_MARKERS: readonly string[] = [
  "lorem ipsum",
  "todo",
  "tbd",
  "placeholder",
  "{{",
  "}}",
  "undefined",
  "null",
  "[object object]",
];

/* ----------------------------------------------------------------------- */
/* Core text gates                                                          */
/* ----------------------------------------------------------------------- */

/**
 * Collect all displayable strings from a structured content object so gates can
 * scan them. Skips obvious URL fields (urls legitimately contain odd tokens).
 */
export function collectStrings(
  value: unknown,
  opts: { skipKeys?: ReadonlySet<string> } = {},
  keyPath = "",
): { path: string; text: string }[] {
  const skip = opts.skipKeys ?? DEFAULT_SKIP_KEYS;
  const out: { path: string; text: string }[] = [];
  const walk = (v: unknown, path: string, key: string) => {
    if (typeof v === "string") {
      if (!skip.has(key)) out.push({ path, text: v });
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${path}[${i}]`, key));
      return;
    }
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        walk(val, path ? `${path}.${k}` : k, k);
      }
    }
  };
  walk(value, keyPath, "");
  return out;
}

const DEFAULT_SKIP_KEYS: ReadonlySet<string> = new Set([
  "url",
  "sourceUrl",
  "originalUrl",
  "href",
]);

export interface SharedGateOptions {
  /** Max length per individual field before flagging (warning). */
  maxFieldLength?: number;
  /** Whether banned-phrase hits are errors (default) or warnings. */
  bannedAsError?: boolean;
}

/** Runs the shared gates over any structured content object. */
export function runSharedGates(
  content: unknown,
  opts: SharedGateOptions = {},
): GateFinding[] {
  const findings: GateFinding[] = [];
  const maxLen = opts.maxFieldLength ?? 2000;
  const bannedSeverity: GateSeverity = opts.bannedAsError === false ? "warning" : "error";
  const strings = collectStrings(content);

  for (const { path, text } of strings) {
    const lower = text.toLowerCase();

    // Banned phrases.
    for (const phrase of BANNED_PHRASES) {
      if (matchesWord(lower, phrase)) {
        findings.push({
          severity: bannedSeverity,
          code: "banned_phrase",
          field: path,
          message: `Contains banned phrase "${phrase}".`,
        });
      }
    }

    // Placeholder / leakage.
    for (const marker of PLACEHOLDER_MARKERS) {
      if (lower.includes(marker)) {
        findings.push({
          severity: "error",
          code: "placeholder_text",
          field: path,
          message: `Contains placeholder/leak token "${marker}".`,
        });
      }
    }

    // Raw JSON leakage into a display field (a string that is itself JSON).
    if (looksLikeJson(text)) {
      findings.push({
        severity: "error",
        code: "json_leak",
        field: path,
        message: "Field appears to contain raw JSON.",
      });
    }

    // Over-length.
    if (text.length > maxLen) {
      findings.push({
        severity: "warning",
        code: "too_long",
        field: path,
        message: `Field is ${text.length} chars (> ${maxLen}).`,
      });
    }
  }

  return findings;
}

/** Flags required sections that are empty/whitespace. */
export function requireNonEmpty(
  content: Record<string, unknown>,
  fields: readonly string[],
): GateFinding[] {
  const findings: GateFinding[] = [];
  for (const f of fields) {
    const v = content[f];
    const empty =
      v == null ||
      (typeof v === "string" && v.trim().length === 0) ||
      (Array.isArray(v) && v.length === 0);
    if (empty) {
      findings.push({
        severity: "error",
        code: "empty_section",
        field: f,
        message: `Required section "${f}" is empty.`,
      });
    }
  }
  return findings;
}

/** Assemble a final report from a set of findings. */
export function toReport(findings: GateFinding[]): GateReport {
  const ok = !findings.some((f) => f.severity === "error");
  const warnings = findings.map(
    (f) => `${f.severity === "error" ? "[error] " : ""}${f.field ? `${f.field}: ` : ""}${f.message}`,
  );
  return { ok, findings, warnings };
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

/**
 * Word-ish match: short tokens (e.g. "unlock", "delve") match on word
 * boundaries to avoid false positives ("unlocked" should still match a stem,
 * but "seamless" shouldn't trip on unrelated substrings). We use a boundary
 * before the phrase; multi-word phrases match as substrings.
 */
function matchesWord(haystack: string, phrase: string): boolean {
  if (phrase.includes(" ") || phrase.includes("-")) {
    return haystack.includes(phrase);
  }
  const re = new RegExp(`\\b${escapeRegExp(phrase)}`, "i");
  return re.test(haystack);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function looksLikeJson(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (!((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))))
    return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/** True when a string is a real http(s) URL. Used by source-grounding gates. */
export function isRealUrl(s: string | null | undefined): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
