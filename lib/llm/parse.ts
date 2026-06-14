/**
 * One Read — strict JSON validators for LLM output.
 *
 * Every numeric is clamped; every required field is defaulted; arrays
 * with fixed-length contracts (3, 5) are coerced or rejected.
 * The pipeline never trusts the model.
 */

import type {
  StructuredScore,
  StructuredSummary,
} from "./types";
import { ALL_TOPIC_SLUGS } from "../topics";

/* ----------------------------------------------------------------------- */
/* Summary                                                                 */
/* ----------------------------------------------------------------------- */

export function parseStructuredSummary(
  raw: unknown,
  fallback: { url: string; originalTitle: string; sourceName: string; targetLanguage: string },
): StructuredSummary | null {
  if (!isRecord(raw)) return null;
  const r = raw;

  const summary: StructuredSummary = {
    subject: str(r.subject, ""),
    preheader: str(r.preheader, ""),
    displayTitle: str(r.displayTitle, fallback.originalTitle),
    originalTitle: str(r.originalTitle, fallback.originalTitle),
    sourceName: str(r.sourceName, fallback.sourceName),
    summaryLanguage: str(r.summaryLanguage, fallback.targetLanguage),
    readingTime: str(r.readingTime, "5 min"),
    oneLineHook: str(r.oneLineHook, ""),
    whyThisArticle: str(r.whyThisArticle, ""),
    threeSentenceSummary: tuple3(fixedLengthStrings(r.threeSentenceSummary, 3)),
    keyTakeaways: tuple5(fixedLengthStrings(r.keyTakeaways, 5)),
    bestFor: tuple3(fixedLengthStrings(r.bestFor, 3)),
    oneThingToRemember: str(r.oneThingToRemember, ""),
    originalUrl: str(r.originalUrl, fallback.url),
    confidence: clamp(numOr(r.confidence, 0), 0, 100),
    editorNotes: str(r.editorNotes, ""),
  };

  // Reject if the spine of the summary is missing.
  if (summary.subject.length < 4) return null;
  if (!hasNonEmpty(summary.threeSentenceSummary, 3)) return null;
  if (!hasNonEmpty(summary.keyTakeaways, 5)) return null;
  if (summary.oneLineHook.length < 4) return null;

  // Force-set fields that must match the request exactly.
  summary.originalUrl = fallback.url;
  summary.originalTitle = fallback.originalTitle;
  summary.sourceName = fallback.sourceName;
  summary.summaryLanguage = fallback.targetLanguage;

  return summary;
}

/* ----------------------------------------------------------------------- */
/* Score                                                                   */
/* ----------------------------------------------------------------------- */

export function parseStructuredScore(
  raw: unknown,
  fallback: { hintedTopic: string },
): StructuredScore | null {
  if (!isRecord(raw)) return null;
  const r = raw;

  const topicCandidate = str(r.topic, fallback.hintedTopic);
  const topic = ALL_TOPIC_SLUGS.includes(topicCandidate)
    ? topicCandidate
    : ALL_TOPIC_SLUGS.includes(fallback.hintedTopic)
      ? fallback.hintedTopic
      : null;
  if (!topic) return null;

  const subtopics = strArray(r.subtopics).slice(0, 6);
  const detectedInterests = strArray(r.detectedInterests)
    .filter((s) => ALL_TOPIC_SLUGS.includes(s))
    .slice(0, 6);

  return {
    topic,
    subtopics,
    detectedInterests,
    difficulty: oneOf(
      str(r.difficulty, "mixed"),
      ["beginner", "intermediate", "advanced", "mixed"],
      "mixed",
    ),
    qualityScore: clamp01(numOr(r.qualityScore, 0)),
    originalityScore: clamp01(numOr(r.originalityScore, 0)),
    usefulnessScore: clamp01(numOr(r.usefulnessScore, 0)),
    readabilityScore: clamp01(numOr(r.readabilityScore, 0)),
    morningReadScore: clamp01(numOr(r.morningReadScore, 0)),
    rejectionReason: nullableString(r.rejectionReason),
    selectionReason: str(r.selectionReason, ""),
  };
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}
function str(x: unknown, fallback: string): string {
  return typeof x === "string" ? x.trim() : fallback;
}
function numOr(x: unknown, fallback: number): number {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
function strArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  const out: string[] = [];
  for (const v of x) {
    const s = typeof v === "string" ? v.trim() : "";
    if (s) out.push(s);
  }
  return out;
}
function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
function nullableString(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const t = x.trim();
  return t.length === 0 || t.toLowerCase() === "null" ? null : t;
}
function fixedLengthStrings(x: unknown, n: number): string[] {
  const arr = strArray(x);
  // Pad / truncate to exactly N.
  while (arr.length < n) arr.push("");
  if (arr.length > n) arr.length = n;
  return arr;
}
function tuple3(arr: string[]): [string, string, string] {
  return [arr[0] ?? "", arr[1] ?? "", arr[2] ?? ""];
}
function tuple5(arr: string[]): [string, string, string, string, string] {
  return [arr[0] ?? "", arr[1] ?? "", arr[2] ?? "", arr[3] ?? "", arr[4] ?? ""];
}
function hasNonEmpty(arr: readonly string[], n: number): boolean {
  return arr.length === n && arr.every((s) => s && s.trim().length > 0);
}
