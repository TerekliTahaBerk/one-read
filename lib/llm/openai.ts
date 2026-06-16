/**
 * OneRead — OpenAI provider.
 *
 * Uses the official `openai` SDK with `response_format: json_object`
 * so we get a clean JSON string we can parse. Defaults to gpt-4o-mini,
 * overridable via `AI_MODEL`.
 *
 * Failure mode: returns `null` on any error or invalid JSON. The pipeline
 * decides whether to fall back to heuristic or skip the article.
 */

import OpenAI from "openai";
import {
  parseStructuredScore,
  parseStructuredSummary,
} from "./parse";
import {
  buildScoreUserPrompt,
  buildSummaryUserPrompt,
  SCORE_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
} from "./prompts";
import type {
  LlmProvider,
  ScoreRequest,
  StructuredScore,
  StructuredSummary,
  SummarizeRequest,
} from "./types";

const DEFAULT_MODEL = process.env.AI_MODEL || "gpt-4o-mini";

export function createOpenAiProvider(): LlmProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set — cannot create OpenAI provider.",
    );
  }
  const client = new OpenAI({ apiKey });

  async function callJson(
    system: string,
    user: string,
  ): Promise<unknown | null> {
    try {
      const res = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const content = res.choices?.[0]?.message?.content;
      if (!content) return null;
      return JSON.parse(content);
    } catch (err) {
      console.error("[llm/openai] call failed:", errMsg(err));
      return null;
    }
  }

  return {
    id: `openai/${DEFAULT_MODEL}`,

    async summarize(req: SummarizeRequest): Promise<StructuredSummary | null> {
      const user = buildSummaryUserPrompt(req);
      // First attempt.
      const raw = await callJson(SUMMARY_SYSTEM_PROMPT, user);
      let parsed = raw
        ? parseStructuredSummary(raw, {
            url: req.url,
            originalTitle: req.title,
            sourceName: req.sourceName,
            targetLanguage: req.targetLanguage,
          })
        : null;
      if (parsed) return parsed;

      // Retry once with a stricter reminder.
      const retry = await callJson(
        SUMMARY_SYSTEM_PROMPT,
        `${user}\n\nIMPORTANT: Your previous output was rejected. Return JSON ONLY, with all required keys filled, no fences.`,
      );
      parsed = retry
        ? parseStructuredSummary(retry, {
            url: req.url,
            originalTitle: req.title,
            sourceName: req.sourceName,
            targetLanguage: req.targetLanguage,
          })
        : null;
      return parsed;
    },

    async score(req: ScoreRequest): Promise<StructuredScore | null> {
      const user = buildScoreUserPrompt(req);
      const raw = await callJson(SCORE_SYSTEM_PROMPT, user);
      let parsed = raw
        ? parseStructuredScore(raw, { hintedTopic: req.hintedTopic })
        : null;
      if (parsed) return parsed;

      const retry = await callJson(
        SCORE_SYSTEM_PROMPT,
        `${user}\n\nIMPORTANT: Your previous output was rejected. Return JSON ONLY, with all required keys, no fences.`,
      );
      parsed = retry
        ? parseStructuredScore(retry, { hintedTopic: req.hintedTopic })
        : null;
      return parsed;
    },
  };
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
