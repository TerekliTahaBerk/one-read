/**
 * OneRead — OneNews quality gates + source-bundle validation.
 *
 * OneNews is the highest factual-risk product, so grounding is enforced twice:
 *  1. validateSourceBundle() — before generation, refuse empty/invalid bundles.
 *  2. runNewsGates() — after generation, ensure every item maps to a REAL
 *     bundle URL, no URL outside the bundle, no empty summaries, no sponsor copy,
 *     no sensational / fake-breaking-news phrases, no markdown leakage, and that
 *     the brief reads like a calm 5-minute morning brief (not a long newsletter).
 */

import type { NewsSourceStory } from "@prisma/client";
import {
  runEditorialPolishGates,
  runSharedGates,
  toReport,
  isRealUrl,
  type GateFinding,
  type GateReport,
} from "@/lib/ai";
import type { NewsIssueContent } from "./types";
import { findSponsorMarker, foldForMatch } from "./sanitize";

/** Fake-urgency / sensational phrases OneNews must never use (TR + EN). */
const SENSATIONAL = [
  "breaking news",
  "breaking:",
  "shocking",
  "you won't believe",
  "you wont believe",
  "urgent:",
  "must see",
  "must-see",
  "son dakika",
  "flaş",
  "flas",
  "şok",
  "skandal",
  "inanılmaz",
  "inanilmaz",
  "dehşet",
  "korkunç",
  "felaket",
  "acil:",
];

/** Priority categories OneNews aims to cover (warn-only if none appear). */
const PRIORITY_CATEGORIES = [
  "piyasa",
  "markets",
  "ekonomi",
  "economy",
  "iş dünyas",
  "is dunyas",
  "business",
  "politik",
  "politics",
  "teknoloji",
  "technology",
];

/** Length limits for the 5-minute-brief feel (soft = warning). */
const MAX_MAIN_SUMMARY_WORDS = 120;
const MAX_AGENDA_ITEMS = 8;
const MAX_AGENDA_SUMMARY_CHARS = 320;

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
  display: { subject?: string; previewText?: string } = {},
): GateReport {
  const findings: GateFinding[] = [
    ...runSharedGates({ ...display, ...content }, { maxFieldLength: 900 }),
    ...runEditorialPolishGates(
      { ...display, ...content },
      {
        product: "one-news",
        genericSubjectPatterns: [
          /^today'?s\s+onenews\b/i,
          /^onenews:\s+your\b/i,
          /\byour calm morning briefing\b/i,
          /\btoday'?s top stories\b/i,
          /^bugünün gündemi$/i,
          /^[a-z\s]+,\s+[a-z\s]+,\s+and\s+[a-z\s]+ updates$/i,
        ],
      },
    ),
  ];
  const allowedUrls = new Set(bundle.map((s) => s.sourceUrl));
  const allowedNames = new Set(bundle.map((s) => s.sourceName));

  const agenda = content.agendaItems ?? [];
  if (agenda.length === 0 && content.topStories.length === 0) {
    findings.push({ severity: "error", code: "no_stories", field: "agendaItems", message: "Briefing has no agenda items." });
  }

  // ---- Source grounding over agenda (legacy topStories mirror) ----
  content.topStories.forEach((story, i) => {
    if (!isRealUrl(story.url)) {
      findings.push({ severity: "error", code: "missing_source_url", field: `agendaItems[${i}].url`, message: "Item has no valid source URL." });
    } else if (!allowedUrls.has(story.url)) {
      findings.push({ severity: "error", code: "url_outside_bundle", field: `agendaItems[${i}].url`, message: "Item URL is not in the source bundle (possible fabrication)." });
    }
    if (!allowedNames.has(story.source)) {
      findings.push({ severity: "error", code: "source_outside_bundle", field: `agendaItems[${i}].source`, message: "Source name is not in the source bundle." });
    }
    if (!story.summary?.trim()) {
      findings.push({ severity: "error", code: "empty_summary", field: `agendaItems[${i}].summary`, message: "Item summary is empty." });
    }
    if (story.summary && story.summary.length > MAX_AGENDA_SUMMARY_CHARS) {
      findings.push({ severity: "warning", code: "agenda_item_too_long", field: `agendaItems[${i}].summary`, message: `Agenda item summary is long (${story.summary.length} chars); keep it to one short sentence.` });
    }
  });

  // ---- Weekend extra grounding ----
  (content.weekendExtra ?? []).forEach((w, i) => {
    if (!isRealUrl(w.url) || !allowedUrls.has(w.url)) {
      findings.push({ severity: "error", code: "weekend_url_outside_bundle", field: `weekendExtra[${i}].url`, message: "weekendExtra URL is not in the source bundle." });
    }
    if (!allowedNames.has(w.source)) {
      findings.push({ severity: "error", code: "weekend_source_outside_bundle", field: `weekendExtra[${i}].source`, message: "weekendExtra source is not in the source bundle." });
    }
  });

  // oneStoryToWatch (legacy; if present) must also be grounded.
  if (content.oneStoryToWatch?.url && !allowedUrls.has(content.oneStoryToWatch.url)) {
    findings.push({ severity: "error", code: "watch_url_outside_bundle", field: "oneStoryToWatch.url", message: "oneStoryToWatch URL is not in the source bundle." });
  }

  // Source list must mirror the bundle (no fabricated citations).
  content.sources.forEach((src, i) => {
    if (!allowedUrls.has(src.url)) {
      findings.push({ severity: "error", code: "sourcelist_outside_bundle", field: `sources[${i}].url`, message: "Source-list URL is not in the bundle." });
    }
  });

  // ---- Sponsor detection (hard error anywhere in reader-facing copy) ----
  const sponsorBlob = [
    display.subject ?? "",
    display.previewText ?? "",
    content.greeting ?? "",
    content.mainHeadline ?? "",
    content.mainSummary ?? "",
    ...(content.alsoToday ?? []),
    ...agenda.flatMap((a) => [a.category, a.title, a.summary, a.whyItMatters ?? ""]),
    ...(content.weekendExtra ?? []).flatMap((w) => [w.title, w.summary]),
  ].join(" \n ");
  const sponsorHit = findSponsorMarker(sponsorBlob);
  if (sponsorHit) {
    findings.push({ severity: "error", code: "sponsor_content", field: "content", message: `Output contains sponsor/paid-placement copy ("${sponsorHit}").` });
  }

  // ---- Sensational / fake-breaking-news framing (TR + EN) ----
  const toneBlob = foldForMatch(sponsorBlob);
  for (const phrase of SENSATIONAL) {
    if (toneBlob.includes(foldForMatch(phrase))) {
      findings.push({ severity: "error", code: "sensational", field: "content", message: `Sensational/clickbait framing ("${phrase}").` });
    }
  }

  // ---- Length: 5-minute-brief feel (soft warnings) ----
  const summaryWords = wordCount(content.mainSummary ?? "");
  if (summaryWords > MAX_MAIN_SUMMARY_WORDS) {
    findings.push({ severity: "warning", code: "summary_too_long", field: "mainSummary", message: `Main summary is ${summaryWords} words; keep it ~50–90 for a 5-minute brief.` });
  }
  if (agenda.length > MAX_AGENDA_ITEMS) {
    findings.push({ severity: "warning", code: "too_many_agenda_items", field: "agendaItems", message: `Briefing has ${agenda.length} agenda items; cap at ${MAX_AGENDA_ITEMS} for a 5-minute brief.` });
  }

  // ---- Category coverage (warn-only; never reject) ----
  if (agenda.length > 0) {
    const catBlob = agenda.map((a) => a.category.toLowerCase()).join(" ");
    const hasPriority = PRIORITY_CATEGORIES.some((c) => catBlob.includes(c));
    if (!hasPriority) {
      findings.push({ severity: "warning", code: "no_priority_category", field: "agendaItems", message: "No markets/economy/business/politics/technology item today (source material may not support it)." });
    }
  }

  return toReport(findings);
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
