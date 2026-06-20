/**
 * OneRead — OneNews quality gates + source-bundle validation.
 *
 * OneNews is the highest factual-risk product, so grounding is enforced twice:
 *  1. validateSourceBundle() — before generation, refuse empty/invalid bundles.
 *  2. runNewsGates() — after generation, ensure every story maps to a REAL
 *     bundle URL, no URL outside the bundle, no empty summaries, no banned /
 *     fake-breaking-news phrases, no markdown leakage.
 */

import type { NewsSourceStory } from "@prisma/client";
import { runSharedGates, toReport, isRealUrl, type GateFinding, type GateReport } from "@/lib/ai";
import type { NewsIssueContent } from "./types";

/** Fake-urgency / sensational phrases OneNews must never use. */
const SENSATIONAL = [
  "breaking news",
  "breaking:",
  "shocking",
  "you won't believe",
  "you wont believe",
  "urgent:",
  "must see",
  "must-see",
];

export interface SourceBundleCheck {
  ok: boolean;
  reason?: string;
  /** Stories that passed validation (real headline + real http(s) url). */
  valid: NewsSourceStory[];
  warnings: string[];
}

/**
 * Validate the source bundle BEFORE calling Gemini. An empty (or all-invalid)
 * bundle means NO_SOURCES — never generate from model knowledge alone.
 */
export function validateSourceBundle(stories: NewsSourceStory[]): SourceBundleCheck {
  const warnings: string[] = [];
  if (!stories || stories.length === 0) {
    return { ok: false, reason: "NO_SOURCES", valid: [], warnings: ["Source bundle is empty."] };
  }
  const valid = stories.filter((s) => {
    const okHeadline = !!s.headline?.trim();
    const okSource = !!s.sourceName?.trim();
    const okUrl = isRealUrl(s.sourceUrl);
    if (!okUrl) warnings.push(`Dropped story "${s.headline ?? "(untitled)"}" — invalid source URL.`);
    else if (!okHeadline) warnings.push("Dropped a story with no headline.");
    else if (!okSource) warnings.push(`Dropped story "${s.headline}" — no source name.`);
    return okHeadline && okSource && okUrl;
  });
  if (valid.length === 0) {
    return { ok: false, reason: "NO_SOURCES", valid: [], warnings: [...warnings, "No valid source stories after validation."] };
  }
  return { ok: true, valid, warnings };
}

/**
 * Post-generation gates. `bundle` is the exact set of real stories that were fed
 * to the model — every emitted URL must come from it.
 */
export function runNewsGates(
  content: NewsIssueContent,
  bundle: NewsSourceStory[],
): GateReport {
  const findings: GateFinding[] = runSharedGates(content, { maxFieldLength: 900 });
  const allowedUrls = new Set(bundle.map((s) => s.sourceUrl));
  const allowedNames = new Set(bundle.map((s) => s.sourceName));

  if (content.topStories.length === 0) {
    findings.push({ severity: "error", code: "no_stories", field: "topStories", message: "Briefing has no stories." });
  }

  content.topStories.forEach((story, i) => {
    // Every story must carry a real source URL FROM the bundle.
    if (!isRealUrl(story.url)) {
      findings.push({ severity: "error", code: "missing_source_url", field: `topStories[${i}].url`, message: "Story has no valid source URL." });
    } else if (!allowedUrls.has(story.url)) {
      findings.push({ severity: "error", code: "url_outside_bundle", field: `topStories[${i}].url`, message: "Story URL is not in the source bundle (possible fabrication)." });
    }
    if (!allowedNames.has(story.source)) {
      findings.push({ severity: "error", code: "source_outside_bundle", field: `topStories[${i}].source`, message: "Source name is not in the source bundle." });
    }
    if (!story.summary?.trim()) {
      findings.push({ severity: "error", code: "empty_summary", field: `topStories[${i}].summary`, message: "Story summary is empty." });
    }
    // Sensational / fake-breaking-news framing.
    const blob = `${story.title} ${story.summary} ${story.whyItMatters}`.toLowerCase();
    for (const phrase of SENSATIONAL) {
      if (blob.includes(phrase)) {
        findings.push({ severity: "error", code: "sensational", field: `topStories[${i}]`, message: `Sensational framing ("${phrase}").` });
      }
    }
  });

  // oneStoryToWatch (if present) must also be grounded.
  if (content.oneStoryToWatch?.url && !allowedUrls.has(content.oneStoryToWatch.url)) {
    findings.push({ severity: "error", code: "watch_url_outside_bundle", field: "oneStoryToWatch.url", message: "oneStoryToWatch URL is not in the source bundle." });
  }

  // Source list must mirror the bundle (no fabricated citations).
  content.sources.forEach((src, i) => {
    if (!allowedUrls.has(src.url)) {
      findings.push({ severity: "error", code: "sourcelist_outside_bundle", field: `sources[${i}].url`, message: "Source-list URL is not in the bundle." });
    }
  });

  // Subject sensational check.
  const subjectBlob = `${content.openingLine}`.toLowerCase();
  for (const phrase of SENSATIONAL) {
    if (subjectBlob.includes(phrase)) {
      findings.push({ severity: "error", code: "sensational_opening", field: "openingLine", message: `Sensational opening ("${phrase}").` });
    }
  }

  return toReport(findings);
}
