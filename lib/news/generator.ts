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
import type { GeneratedNewsIssue, NewsIssueContent, NewsStory } from "./types";

/**
 * OneNews issue generator. STRICTLY source-grounded via the SHARED Gemini
 * provider (lib/ai). It only ever rewrites the calm summary / "why it matters"
 * framing of REAL stories passed in. It never invents stories, sources, or URLs
 * — those are copied verbatim from the provided NewsSourceStory rows, matched by
 * index. With no valid sources it returns generated:false (NO_SOURCES) so the
 * pipeline shows an admin warning instead of fake news.
 *
 * Pure: never reads or writes the database. The pipeline handles caching.
 */

export interface NewsGenerateOptions {
  tone?: string | null;
  depth?: string | null;
  /**
   * Allow the deterministic (non-AI) grounded framing as a fallback. It uses
   * ONLY the real headline/excerpt/url (invents nothing). Default: dev only —
   * in production a Gemini failure means no briefing is sent (no fallback)
   * unless this is explicitly set true.
   */
  allowDeterministic?: boolean;
}

export async function generateNewsIssue(
  seg: NewsSegment,
  stories: NewsSourceStory[],
  opts: NewsGenerateOptions = {},
): Promise<GeneratedNewsIssue> {
  const isProd = process.env.NODE_ENV === "production";

  // Rule #1: validate the source bundle FIRST. No valid sources → never fabricate.
  const bundleCheck = validateSourceBundle(stories);
  if (!bundleCheck.ok) {
    return noSources(seg, bundleCheck.warnings);
  }
  const bundle = bundleCheck.valid.slice(0, 5);
  const sourceBundleHash = stableHash(
    bundle.map((s) => ({ id: s.id, url: s.sourceUrl, headline: s.headline, excerpt: s.excerpt ?? "" })),
  );
  const inputHash = stableHash({ sourceBundleHash, promptVersion: NEWS_PROMPT_VERSION, lang: seg.briefingLanguage, region: seg.regionFocus });

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
      },
    );

    if (result.ok) {
      const content = mapBriefing(result.data, bundle);
      const gate = runNewsGates(content, bundle);
      if (gate.ok) {
        return {
          title: `${seg.regionFocus} briefing`,
          subject: result.data.subject,
          previewText: (result.data.previewText || content.openingLine).slice(0, 140),
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
            warnings: mergeWarnings(bundleCheck.warnings, gate.warnings),
            repaired: result.repaired,
          }, sourceBundleHash, bundle.length),
        };
      }
      console.error(`[news/generator] quality gate failed: ${gate.warnings.join(" | ")}`);
      if (allowFallback) return deterministic(seg, bundle, inputHash, sourceBundleHash, "quality_gate_failed", gate.warnings);
    } else {
      console.error(`[news/generator] gemini failed: ${result.kind} — ${result.message}`);
      if (allowFallback) return deterministic(seg, bundle, inputHash, sourceBundleHash, `${result.kind}: ${result.message}`);
    }

    return generationUnavailable(seg, inputHash, sourceBundleHash, bundle.length, "generation_failed");
  }

  // Gemini not configured.
  if (allowFallback) return deterministic(seg, bundle, inputHash, sourceBundleHash, "gemini_not_configured");
  return generationUnavailable(seg, inputHash, sourceBundleHash, bundle.length, "ai_unavailable_in_production");
}

/* ----------------------------------------------------------------------- */
/* Mapping (validated index-based output → grounded content)                */
/* ----------------------------------------------------------------------- */

function mapBriefing(d: NewsBriefingValidated, bundle: NewsSourceStory[]): NewsIssueContent {
  // Only stories whose index is valid; in input order; de-duplicated.
  const seen = new Set<number>();
  const ordered = d.topStories
    .filter((t) => t.index >= 0 && t.index < bundle.length && !seen.has(t.index) && seen.add(t.index) !== undefined)
    .sort((a, b) => a.index - b.index);

  const topStories: NewsStory[] = ordered.map((t) => {
    const s = bundle[t.index];
    return {
      title: t.title || s.headline,
      source: s.sourceName, // verbatim from bundle — never the model
      summary: t.summary || (s.excerpt ?? ""),
      whyItMatters: t.whyItMatters || "",
      url: s.sourceUrl, // verbatim from bundle — never the model
    };
  });

  let oneStoryToWatch: NewsIssueContent["oneStoryToWatch"];
  const watch = d.oneStoryToWatch;
  if (watch && watch.index >= 0 && watch.index < bundle.length) {
    const s = bundle[watch.index];
    oneStoryToWatch = { title: s.headline, note: watch.note ?? "", source: s.sourceName, url: s.sourceUrl };
  }

  const usedIds = new Set(ordered.map((t) => t.index));
  const sources = bundle
    .filter((_, i) => usedIds.has(i))
    .map((s) => ({ source: s.sourceName, url: s.sourceUrl }));

  return {
    openingLine: d.openingLine || "Here is your calm morning briefing.",
    topStories,
    oneStoryToWatch,
    quietContext: d.quietContext || undefined,
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
  extraWarnings: string[] = [],
): GeneratedNewsIssue {
  const topStories: NewsStory[] = bundle.map((s) => ({
    title: s.headline,
    source: s.sourceName,
    summary: s.excerpt ?? "",
    whyItMatters: "",
    url: s.sourceUrl,
  }));
  const content: NewsIssueContent = {
    openingLine: "Here is your calm morning briefing — the stories worth knowing today.",
    topStories,
    oneStoryToWatch: undefined,
    quietContext: undefined,
    sources: bundle.map((s) => ({ source: s.sourceName, url: s.sourceUrl })),
  };
  return {
    title: `${seg.regionFocus} briefing`,
    subject: "Today's OneNews: the stories worth knowing",
    previewText: "A short, calm briefing with links to the original sources.",
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
    }, sourceBundleHash, bundle.length),
  };
}

/* ----------------------------------------------------------------------- */
/* Non-generation results                                                    */
/* ----------------------------------------------------------------------- */

function noSources(seg: NewsSegment, warnings: string[]): GeneratedNewsIssue {
  return {
    title: `${seg.regionFocus} briefing`,
    subject: "OneNews: your calm morning briefing",
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
    }, "", 0),
  };
}

function generationUnavailable(
  seg: NewsSegment,
  inputHash: string,
  sourceBundleHash: string,
  bundleSize: number,
  error: string,
): GeneratedNewsIssue {
  return {
    title: `${seg.regionFocus} briefing`,
    subject: "OneNews: your calm morning briefing",
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
    }, sourceBundleHash, bundleSize),
  };
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ----------------------------------------------------------------------- */

/** Provenance bag with OneNews-specific source-bundle fields. */
function metaRecord(
  partial: Parameters<typeof buildGenerationMeta>[0],
  sourceBundleHash: string,
  sourceCount: number,
): Record<string, unknown> {
  return {
    ...(buildGenerationMeta(partial) as unknown as Record<string, unknown>),
    sourceBundleHash,
    sourceCount,
  };
}

function mergeWarnings(a: string[], b: string[]): string[] | undefined {
  const all = [...a, ...b].filter(Boolean);
  return all.length ? all : undefined;
}

function emptyContent(): NewsIssueContent {
  return { openingLine: "", topStories: [], sources: [] };
}
