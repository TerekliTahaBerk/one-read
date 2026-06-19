import type { NewsPreferences } from "@prisma/client";

/**
 * A briefing segment groups subscribers who can share the same daily issue. To
 * control generation cost we group by (briefingLanguage, regionFocus, a coarse
 * topic cluster) — never one issue per user. The topic cluster is derived from
 * the core section toggles so people with similar interests share an issue.
 */
export interface NewsSegment {
  briefingLanguage: string;
  regionFocus: string;
  /** Ordered list of enabled core topics, e.g. ["world","business","technology"]. */
  topics: string[];
}

const SEP = "__";

function token(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Derives the ordered core-topic list from a subscriber's section toggles. */
export function newsTopicsFor(
  prefs: Pick<
    NewsPreferences,
    "wantsWorld" | "wantsBusiness" | "wantsTechnology" | "wantsCulture" | "wantsScience" | "wantsSports"
  >,
): string[] {
  const topics: string[] = [];
  if (prefs.wantsWorld) topics.push("world");
  if (prefs.wantsBusiness) topics.push("business");
  if (prefs.wantsTechnology) topics.push("technology");
  if (prefs.wantsCulture) topics.push("culture");
  if (prefs.wantsScience) topics.push("science");
  if (prefs.wantsSports) topics.push("sports");
  // Always brief on something — fall back to a calm general set.
  return topics.length > 0 ? topics : ["world", "business", "technology"];
}

/** e.g. "en__global__world-business-technology". */
export function segmentKeyForSegment(seg: NewsSegment): string {
  const lang = seg.briefingLanguage === "Turkish" ? "tr" : "en";
  return [lang, token(seg.regionFocus), seg.topics.join("-")].join(SEP);
}

export function segmentFor(prefs: NewsPreferences): NewsSegment {
  return {
    briefingLanguage: prefs.briefingLanguage,
    regionFocus: prefs.regionFocus,
    topics: newsTopicsFor(prefs),
  };
}

export function segmentKeyFor(prefs: NewsPreferences): string {
  return segmentKeyForSegment(segmentFor(prefs));
}

/** Human-readable label for admin views. */
export function segmentLabel(seg: NewsSegment): string {
  return `${seg.briefingLanguage} · ${seg.regionFocus} · ${seg.topics.join(", ")}`;
}
