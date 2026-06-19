import type { LingoPreferences } from "@prisma/client";

/**
 * A lesson segment groups learners who can share the same daily lesson. For the
 * MVP we group by (targetLanguage, nativeLanguage, level) only — finer grouping
 * by goal/style would multiply generation cost. Goal/interests can still lightly
 * flavor a segment's lesson in the generator without splitting the segment.
 */
export interface LingoSegment {
  targetLanguage: string;
  nativeLanguage: string;
  level: string;
}

const SEP = "__";

/** Normalizes a value into a segment-key token (lowercase, spaces → "-"). */
function token(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

/** e.g. { Spanish, Turkish, Upper-intermediate } → "spanish__turkish__upper-intermediate". */
export function segmentKeyForSegment(seg: LingoSegment): string {
  return [token(seg.targetLanguage), token(seg.nativeLanguage), token(seg.level)].join(SEP);
}

/** Builds the segment key for a learner's preferences. */
export function segmentKeyFor(
  prefs: Pick<LingoPreferences, "targetLanguage" | "nativeLanguage" | "level">,
): string {
  return segmentKeyForSegment({
    targetLanguage: prefs.targetLanguage,
    nativeLanguage: prefs.nativeLanguage,
    level: prefs.level,
  });
}

/** Builds a LingoSegment from a learner's preferences (display values kept). */
export function segmentFor(
  prefs: Pick<LingoPreferences, "targetLanguage" | "nativeLanguage" | "level">,
): LingoSegment {
  return {
    targetLanguage: prefs.targetLanguage,
    nativeLanguage: prefs.nativeLanguage,
    level: prefs.level,
  };
}

/** Human-readable label for admin views, e.g. "Spanish · Turkish · Intermediate". */
export function segmentLabel(seg: LingoSegment): string {
  return `${seg.targetLanguage} · ${seg.nativeLanguage} · ${seg.level}`;
}
