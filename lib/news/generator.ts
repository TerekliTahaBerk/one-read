import type { NewsSourceStory } from "@prisma/client";
import {
  generateJsonWithGemini,
  geminiConfigured,
  buildGenerationMeta,
  stableHash,
} from "@/lib/ai";
import type { NewsSegment } from "./segments";
import {
  NEWS_PROMPT_VERSION,
  NEWS_SYSTEM_PROMPT,
  NewsBriefingSchema,
  buildNewsUserPrompt,
  type NewsBriefingValidated,
} from "./prompts";
import { runNewsGates, validateSourceBundle } from "./quality";
import { sanitizeSourceStories } from "./sanitize";
import type {
  GeneratedNewsIssue,
  NewsAgendaItem,
  NewsIssueContent,
  NewsStory,
  NewsWeekendItem,
} from "./types";

/**
 * OneNews issue generator. STRICTLY source-grounded via the SHARED Gemini
 * provider (lib/ai). It produces a Turkish-first, sponsor-free, 5-minute morning
 * brief. It only ever rewrites the calm framing of REAL stories passed in — it
 * never invents stories, sources, or URLs (those are copied verbatim from the
 * provided NewsSourceStory rows, matched by index). With no valid sources it
 * returns generated:false (NO_SOURCES) so the pipeline shows an admin warning
 * instead of fake news.
 *
 * Sponsor copy is filtered out of the source material BEFORE the bundle is
 * created, so it never enters the Gemini input or the rendered email.
 *
 * Pure: never reads or writes the database. The pipeline handles caching.
 */

export interface NewsGenerateOptions {
  tone?: string | null;
  depth?: string | null;
  /** ISO date for the briefing day (greeting context). */
  today?: string;
  /**
   * Allow the deterministic (non-AI) grounded framing as a fallback. It uses
   * ONLY the real headline/excerpt/url (invents nothing). Default: dev only —
   * in production a Gemini failure means no briefing is sent (no fallback)
   * unless this is explicitly set true.
   */
  allowDeterministic?: boolean;
}

/** Max stories briefed from in one issue (agenda wants 5–8 items). */
const MAX_BUNDLE = 8;

export async function generateNewsIssue(
  seg: NewsSegment,
  stories: NewsSourceStory[],
  opts: NewsGenerateOptions = {},
): Promise<GeneratedNewsIssue> {
  const isProd = process.env.NODE_ENV === "production";

  // Rule #0: strip sponsor blocks BEFORE building the bundle.
  const sanitized = sanitizeSourceStories(stories);
  const sponsorMeta = {
    droppedSponsorCount: sanitized.droppedSponsorCount,
    cleanedExcerptCount: sanitized.cleanedExcerptCount,
  };

  // Rule #1: validate the source bundle FIRST. No valid sources → never fabricate.
  const bundleCheck = validateSourceBundle(sanitized.clean);
  if (!bundleCheck.ok) {
    return noSources(seg, [...sanitized.warnings, ...bundleCheck.warnings]);
  }
  const bundle = bundleCheck.valid.slice(0, MAX_BUNDLE);
  const sourceBundleHash = stableHash(
    bundle.map((s) => ({ id: s.id, url: s.sourceUrl, headline: s.headline, excerpt: s.excerpt ?? "" })),
  );
  const inputHash = stableHash({ sourceBundleHash, promptVersion: NEWS_PROMPT_VERSION, lang: seg.briefingLanguage, region: seg.regionFocus });
  const baseWarnings = [...sanitized.warnings, ...bundleCheck.warnings];

  const allowFallback = opts.allowDeterministic ?? !isProd;

  if (geminiConfigured()) {
    const result = await generateJsonWithGemini(
      buildNewsUserPrompt(seg, bundle, opts),
      NewsBriefingSchema,
      {
        product: "one-news",
        task: "news-briefing",
        tier: "quality",
        system: NEWS_SYSTEM_PROMPT,
        promptVersion: NEWS_PROMPT_VERSION,
        // The 5-minute brief emits a larger JSON (greeting + headline + summary +
        // 5–8 agenda items). Gemini 2.5-flash spends part of the output budget on
        // "thinking", so the 4096 default can truncate the JSON and fail schema
        // validation. Give it explicit headroom so OneNews works without relying
        // on a GEMINI_MAX_OUTPUT_TOKENS env override in production.
        maxOutputTokens: 8192,
      },
    );

    if (result.ok) {
      const content = mapBriefing(result.data, bundle, seg);
      const gate = runNewsGates(content, bundle, {
        subject: result.data.subject,
        previewText: result.data.previewText,
      });
      if (gate.ok) {
        return {
          title: `${seg.regionFocus} briefing`,
          subject: result.data.subject,
          previewText: (result.data.previewText || content.mainHeadline || content.openingLine).slice(0, 140),
          content,
          generated: true,
          provider: "gemini",
          model: result.model,
          metadata: metaRecord({
            provider: "gemini",
            model: result.model,
            promptVersion: NEWS_PROMPT_VERSION,
            inputHash,
            source: "ai",
            validationStatus: "VALID",
            warnings: mergeWarnings(baseWarnings, gate.warnings),
            repaired: result.repaired,
          }, sourceBundleHash, bundle.length, sponsorMeta),
        };
      }
      console.error(`[news/generator] quality gate failed: ${gate.warnings.join(" | ")}`);
      if (allowFallback) return deterministic(seg, bundle, inputHash, sourceBundleHash, "quality_gate_failed", sponsorMeta, mergeWarnings(baseWarnings, gate.warnings) ?? []);
    } else {
      console.error(`[news/generator] gemini failed: ${result.kind} — ${result.message}`);
      if (allowFallback) return deterministic(seg, bundle, inputHash, sourceBundleHash, `${result.kind}: ${result.message}`, sponsorMeta, baseWarnings);
    }

    return generationUnavailable(seg, inputHash, sourceBundleHash, bundle.length, "generation_failed", sponsorMeta);
  }

  // Gemini not configured.
  if (allowFallback) return deterministic(seg, bundle, inputHash, sourceBundleHash, "gemini_not_configured", sponsorMeta, baseWarnings);
  return generationUnavailable(seg, inputHash, sourceBundleHash, bundle.length, "ai_unavailable_in_production", sponsorMeta);
}

/* ----------------------------------------------------------------------- */
/* Mapping (validated index-based output → grounded content)                */
/* ----------------------------------------------------------------------- */

function mapBriefing(
  d: NewsBriefingValidated,
  bundle: NewsSourceStory[],
  seg: NewsSegment,
): NewsIssueContent {
  // Only items whose index is valid; de-duplicated; in input order.
  const seen = new Set<number>();
  const ordered = d.agendaItems
    .filter((t) => t.index >= 0 && t.index < bundle.length && !seen.has(t.index) && seen.add(t.index) !== undefined)
    .sort((a, b) => a.index - b.index);

  const agendaItems: NewsAgendaItem[] = ordered.map((t) => {
    const s = bundle[t.index];
    return {
      category: t.category || topicLabel(s.topic, seg.briefingLanguage),
      title: t.title || s.headline,
      summary: t.summary || (s.excerpt ?? ""),
      whyItMatters: t.whyItMatters || undefined,
      source: s.sourceName, // verbatim from bundle — never the model
      url: s.sourceUrl, // verbatim from bundle — never the model
    };
  });

  // Weekend extras (grounded by index; skip indexes already used in agenda).
  const weekendExtra: NewsWeekendItem[] = (d.weekendExtra ?? [])
    .filter((w) => w.index >= 0 && w.index < bundle.length && !seen.has(w.index) && seen.add(w.index) !== undefined)
    .map((w) => {
      const s = bundle[w.index];
      return {
        title: w.title || s.headline,
        summary: w.summary || (s.excerpt ?? ""),
        source: s.sourceName,
        url: s.sourceUrl,
      };
    });

  // Legacy mirror — drives grounding gates and any legacy renderer path.
  const topStories: NewsStory[] = agendaItems.map((a) => ({
    title: a.title,
    source: a.source,
    summary: a.summary,
    whyItMatters: a.whyItMatters ?? "",
    url: a.url,
  }));

  // Source list mirrors agenda + weekend URLs (deduped, in order).
  const sourceSeen = new Set<string>();
  const sources = [...agendaItems, ...weekendExtra]
    .filter((x) => !sourceSeen.has(x.url) && sourceSeen.add(x.url) !== undefined)
    .map((x) => ({ source: x.source, url: x.url }));

  return {
    greeting: d.greeting || undefined,
    mainHeadline: d.mainHeadline || undefined,
    mainSummary: d.mainSummary || undefined,
    agendaItems,
    alsoToday: (d.alsoToday ?? []).length ? d.alsoToday : undefined,
    weekendExtra: weekendExtra.length ? weekendExtra : undefined,
    // Legacy mirrors:
    openingLine: d.mainSummary || d.greeting || "İşte bugünün kısa gündem özeti.",
    topStories,
    quietContext: undefined,
    sources,
  };
}

/* ----------------------------------------------------------------------- */
/* Deterministic grounded fallback (uses ONLY real source material)         */
/* ----------------------------------------------------------------------- */

function deterministic(
  seg: NewsSegment,
  bundle: NewsSourceStory[],
  inputHash: string,
  sourceBundleHash: string,
  error: string,
  sponsorMeta: SponsorMeta,
  extraWarnings: string[] = [],
): GeneratedNewsIssue {
  const tr = seg.briefingLanguage === "Turkish";
  const agendaItems: NewsAgendaItem[] = bundle.map((s) => ({
    category: topicLabel(s.topic, seg.briefingLanguage),
    title: s.headline,
    summary: s.excerpt ?? "",
    whyItMatters: undefined,
    source: s.sourceName,
    url: s.sourceUrl,
  }));
  const topStories: NewsStory[] = agendaItems.map((a) => ({
    title: a.title,
    source: a.source,
    summary: a.summary,
    whyItMatters: "",
    url: a.url,
  }));
  const greeting = tr ? "Günaydın, işte bugünün kısa gündem özeti." : "Good morning — here is today's short brief.";
  const mainHeadline = bundle[0]?.headline ?? "";
  const mainSummary = tr
    ? "Bugünün öne çıkan gelişmeleri kaynaklara dayalı olarak aşağıda kısaca özetlendi."
    : "Today's key developments are summarized below, grounded in the listed sources.";
  const content: NewsIssueContent = {
    greeting,
    mainHeadline: mainHeadline || undefined,
    mainSummary,
    agendaItems,
    alsoToday: undefined,
    weekendExtra: undefined,
    openingLine: mainSummary,
    topStories,
    quietContext: undefined,
    sources: bundle.map((s) => ({ source: s.sourceName, url: s.sourceUrl })),
  };
  return {
    title: `${seg.regionFocus} briefing`,
    subject: tr ? "OneNews: bugünün kısa gündem özeti" : "OneNews: today's short brief",
    previewText: tr
      ? "5 dakikalık sabah gündem özeti, kaynak bağlantılarıyla."
      : "A 5-minute morning brief with links to the original sources.",
    content,
    generated: true,
    provider: "deterministic",
    model: "deterministic",
    metadata: metaRecord({
      provider: "deterministic",
      model: "deterministic",
      promptVersion: NEWS_PROMPT_VERSION,
      inputHash,
      source: "deterministic",
      validationStatus: "SKIPPED",
      warnings: extraWarnings.length ? extraWarnings : undefined,
      error,
    }, sourceBundleHash, bundle.length, sponsorMeta),
  };
}

/* ----------------------------------------------------------------------- */
/* Non-generation results                                                    */
/* ----------------------------------------------------------------------- */

function noSources(seg: NewsSegment, warnings: string[]): GeneratedNewsIssue {
  return {
    title: `${seg.regionFocus} briefing`,
    subject: "OneNews: bugünün gündem özeti",
    previewText: "",
    content: emptyContent(),
    generated: false,
    reason: "NO_SOURCES",
    provider: null,
    model: null,
    metadata: metaRecord({
      provider: null,
      model: null,
      promptVersion: NEWS_PROMPT_VERSION,
      inputHash: "",
      source: "none",
      validationStatus: "SKIPPED",
      warnings: warnings.length ? warnings : undefined,
      error: "no_source_material",
    }, "", 0, { droppedSponsorCount: 0, cleanedExcerptCount: 0 }),
  };
}

function generationUnavailable(
  seg: NewsSegment,
  inputHash: string,
  sourceBundleHash: string,
  bundleSize: number,
  error: string,
  sponsorMeta: SponsorMeta,
): GeneratedNewsIssue {
  return {
    title: `${seg.regionFocus} briefing`,
    subject: "OneNews: bugünün gündem özeti",
    previewText: "",
    content: emptyContent(),
    generated: false,
    reason: "GENERATION_UNAVAILABLE",
    provider: "gemini",
    model: null,
    metadata: metaRecord({
      provider: "gemini",
      model: null,
      promptVersion: NEWS_PROMPT_VERSION,
      inputHash,
      source: "none",
      validationStatus: "SKIPPED",
      error,
    }, sourceBundleHash, bundleSize, sponsorMeta),
  };
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ----------------------------------------------------------------------- */

interface SponsorMeta {
  droppedSponsorCount: number;
  cleanedExcerptCount: number;
}

/** Maps an internal topic token to a short reader-facing category label. */
function topicLabel(topic: string, language: string): string {
  const tr = language === "Turkish";
  const map: Record<string, [string, string]> = {
    markets: ["Piyasalar", "Markets"],
    business: ["İş dünyası", "Business"],
    economy: ["Ekonomi", "Economy"],
    politics: ["Politika", "Politics"],
    technology: ["Teknoloji", "Technology"],
    world: ["Dünya", "World"],
    turkey: ["Türkiye", "Turkey"],
    culture: ["Kültür", "Culture"],
    science: ["Bilim", "Science"],
    sports: ["Spor", "Sports"],
    weekend: ["Hafta sonu", "Weekend"],
  };
  const entry = map[topic?.toLowerCase()];
  if (entry) return tr ? entry[0] : entry[1];
  return topic || (tr ? "Gündem" : "Today");
}

/** Provenance bag with OneNews-specific source-bundle fields. */
function metaRecord(
  partial: Parameters<typeof buildGenerationMeta>[0],
  sourceBundleHash: string,
  sourceCount: number,
  sponsorMeta: SponsorMeta,
): Record<string, unknown> {
  return {
    ...(buildGenerationMeta(partial) as unknown as Record<string, unknown>),
    sourceBundleHash,
    sourceCount,
    droppedSponsorCount: sponsorMeta.droppedSponsorCount,
    cleanedExcerptCount: sponsorMeta.cleanedExcerptCount,
    sponsorFree: true,
  };
}

function mergeWarnings(a: string[], b: string[]): string[] | undefined {
  const all = [...a, ...b].filter(Boolean);
  return all.length ? all : undefined;
}

function emptyContent(): NewsIssueContent {
  return { openingLine: "", topStories: [], sources: [], agendaItems: [] };
}
