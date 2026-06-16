/**
 * OneRead — Anthropic provider.
 *
 * Anthropic's `messages.create` returns blocks; we ask for raw JSON in
 * the user message and parse the first text block. We don't use tool
 * calling here — the JSON-only contract is cheaper and equally strict.
 *
 * Failure mode: returns `null` on any error or invalid JSON.
 */

import Anthropic from "@anthropic-ai/sdk";
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

const DEFAULT_MODEL = process.env.AI_MODEL || "claude-3-5-haiku-latest";

export function createAnthropicProvider(): LlmProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set — cannot create Anthropic provider.",
    );
  }
  const client = new Anthropic({ apiKey });

  async function callJson(
    system: string,
    user: string,
  ): Promise<unknown | null> {
    try {
      const res = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 2048,
        temperature: 0.3,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = res.content?.[0];
      const text = block && "text" in block ? block.text : "";
      if (!text) return null;
      // Defensive: strip code fences if present.
      const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.error("[llm/anthropic] call failed:", errMsg(err));
      return null;
    }
  }

  return {
    id: `anthropic/${DEFAULT_MODEL}`,

    async summarize(req: SummarizeRequest): Promise<StructuredSummary | null> {
      const user = buildSummaryUserPrompt(req);
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

      const retry = await callJson(
        SUMMARY_SYSTEM_PROMPT,
        `${user}\n\nIMPORTANT: Your previous output was rejected. Return JSON ONLY.`,
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
        `${user}\n\nIMPORTANT: Your previous output was rejected. Return JSON ONLY.`,
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
