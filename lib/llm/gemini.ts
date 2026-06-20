/**
 * OneRead — Gemini provider (implements the shared LlmProvider contract).
 *
 * This is OneArticle's brain when AI_PROVIDER=gemini. It is ADDITIVE: the
 * OpenAI and Anthropic providers remain unchanged. All Gemini access goes
 * through the single shared module in `lib/ai` — there is no second Gemini
 * client here.
 *
 * - summarize(): versioned article-brief prompt + Zod schema + quality gates.
 * - score(): reuses the existing scoring prompt; permissive JSON then the same
 *   strict parseStructuredScore validator used by the other providers.
 */

import { z } from "zod";
import {
  generateJsonWithGemini,
  runEditorialPolishGates,
  runSharedGates,
  toReport,
  isRealUrl,
  type GeminiModelTier,
} from "@/lib/ai";
import { parseStructuredScore } from "./parse";
import { buildScoreUserPrompt, SCORE_SYSTEM_PROMPT } from "./prompts";
import {
  ARTICLE_PROMPT_VERSION,
  ARTICLE_SYSTEM_PROMPT,
  ArticleBriefSchema,
  buildArticleUserPrompt,
} from "../one-article/prompts";
import type {
  LlmProvider,
  ScoreRequest,
  StructuredScore,
  StructuredSummary,
  SummarizeRequest,
} from "./types";

/** Loose schema for scoring — real validation stays in parseStructuredScore. */
const LooseObjectSchema = z.record(z.string(), z.unknown());

export function createGeminiProvider(): LlmProvider {
  const qualityModel =
    process.env.GEMINI_MODEL_QUALITY?.trim() || "gemini-2.5-flash";
  const id = `gemini/${qualityModel}@${ARTICLE_PROMPT_VERSION}`;

  return {
    id,

    async summarize(req: SummarizeRequest): Promise<StructuredSummary | null> {
      const tier: GeminiModelTier = "quality";
      const result = await generateJsonWithGemini(
        buildArticleUserPrompt(req),
        ArticleBriefSchema,
        {
          product: "one-article",
          task: "article-brief",
          tier,
          system: ARTICLE_SYSTEM_PROMPT,
          promptVersion: ARTICLE_PROMPT_VERSION,
        },
      );
      if (!result.ok) {
        console.error(
          `[llm/gemini] summarize failed: ${result.kind} — ${result.message}`,
        );
        return null;
      }

      // Map validated output → StructuredSummary, forcing request-pinned fields
      // (URL/title/source/language never come from the model).
      const d = result.data;
      const summary: StructuredSummary = {
        subject: d.subject,
        preheader: d.preheader ?? "",
        displayTitle: d.displayTitle || req.title,
        originalTitle: req.title,
        sourceName: req.sourceName,
        summaryLanguage: req.targetLanguage,
        readingTime: d.readingTime || "5 min",
        oneLineHook: d.oneLineHook,
        whyThisArticle: d.whyThisArticle ?? "",
        threeSentenceSummary: [
          d.threeSentenceSummary[0] ?? "",
          d.threeSentenceSummary[1] ?? "",
          d.threeSentenceSummary[2] ?? "",
        ],
        keyTakeaways: [
          d.keyTakeaways[0] ?? "",
          d.keyTakeaways[1] ?? "",
          d.keyTakeaways[2] ?? "",
          d.keyTakeaways[3] ?? "",
          d.keyTakeaways[4] ?? "",
        ],
        bestFor: [d.bestFor[0] ?? "", d.bestFor[1] ?? "", d.bestFor[2] ?? ""],
        oneThingToRemember: d.oneThingToRemember ?? "",
        originalUrl: req.url,
        confidence: clamp(Math.round(d.confidence ?? 0), 0, 100),
        editorNotes: d.editorNotes ?? "",
      };

      // Quality gates (Phase 9). Banned phrases / placeholder / JSON leak +
      // article-specific source-URL preservation.
      const gateContent = {
        subject: summary.subject,
        preheader: summary.preheader,
        oneLineHook: summary.oneLineHook,
        whyThisArticle: summary.whyThisArticle,
        threeSentenceSummary: summary.threeSentenceSummary,
        keyTakeaways: summary.keyTakeaways,
        bestFor: summary.bestFor,
        oneThingToRemember: summary.oneThingToRemember,
      };
      const findings = [
        ...runSharedGates(gateContent, { maxFieldLength: 1200 }),
        ...runEditorialPolishGates(gateContent, { product: "one-article" }),
      ];
      const genericArticleOpeners =
        /\b(in this article|this article|this piece|this post|the author argues|the author explains)\b/i;
      for (const [field, value] of Object.entries(gateContent)) {
        const values = Array.isArray(value) ? value : [value];
        values.forEach((text, i) => {
          if (typeof text === "string" && genericArticleOpeners.test(text)) {
            findings.push({
              severity: "warning",
              code: "generic_article_framing",
              field: Array.isArray(value) ? `${field}[${i}]` : field,
              message: "Avoid generic article-summary framing; write the idea directly.",
            });
          }
        });
      }
      if (!isRealUrl(summary.originalUrl)) {
        findings.push({
          severity: "error",
          code: "missing_source_url",
          field: "originalUrl",
          message: "Source URL is missing or invalid.",
        });
      }
      const report = toReport(findings);

      if (report.warnings.length > 0) {
        // Surface in admin via editorNotes; never silently drop.
        summary.editorNotes = [summary.editorNotes, `Quality gate: ${report.warnings.join(" | ")}`]
          .filter(Boolean)
          .join("\n");
      }
      if (!report.ok) {
        // Hard gate failure → force rejection downstream (summarizer rejects on
        // low confidence). We do not send content that fails a gate.
        summary.confidence = Math.min(summary.confidence, 0);
      }
      if (result.repaired) {
        summary.editorNotes = [summary.editorNotes, "Note: JSON required a repair retry."]
          .filter(Boolean)
          .join("\n");
      }

      return summary;
    },

    async score(req: ScoreRequest): Promise<StructuredScore | null> {
      const result = await generateJsonWithGemini(
        buildScoreUserPrompt(req),
        LooseObjectSchema,
        {
          product: "one-article",
          task: "article-score",
          tier: "fast",
          system: SCORE_SYSTEM_PROMPT,
        },
      );
      if (!result.ok) {
        console.error(`[llm/gemini] score failed: ${result.kind} — ${result.message}`);
        return null;
      }
      return parseStructuredScore(result.data, { hintedTopic: req.hintedTopic });
    },
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
