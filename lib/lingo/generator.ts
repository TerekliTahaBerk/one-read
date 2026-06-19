import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { LingoSegment } from "./segments";
import { heuristicLesson } from "./heuristic";
import type {
  GeneratedLingoLesson,
  LingoExercise,
  LingoLessonContent,
  LingoPhrase,
  LingoWord,
} from "./types";

/**
 * OneLingo lesson generator. Produces a single day's lesson for a segment
 * (targetLanguage + nativeLanguage + level), as strict JSON. Uses the
 * configured AI provider; falls back to a deterministic heuristic lesson in
 * development. In production without an AI provider it returns `generated:
 * false` so the pipeline marks the lesson NOT_GENERATED (no silent fake content)
 * unless `allowProdFallback` is explicitly set.
 *
 * The generator is pure: it never reads or writes the database. The pipeline
 * handles find-or-create caching keyed by (lessonDate, segmentKey).
 */

export interface GenerateOptions {
  /** Optional goal flavor (does not split the segment). */
  learningGoal?: string | null;
  /** Optional interest flavor. */
  interests?: string[];
  /** Allow the heuristic fallback even in production. Default false. */
  allowProdFallback?: boolean;
}

const SYSTEM_PROMPT = `You are OneLingo, a calm, practical language tutor who prepares one short daily practice email.
Tone: calm, practical, premium, useful. Never childish, gamified, academic-heavy, or generic.
Hard rules:
- Explanations are written in the NATIVE language; examples are in the TARGET language.
- Be strictly level-appropriate. Do not overload beginners; do not condescend to advanced learners.
- Never invent grammar rules or false facts. If unsure, keep it simple and correct.
- No offensive, medical, legal, political, or stereotyping content.
- Keep it short — about 5 minutes of practice.
Return STRICT JSON ONLY (no markdown, no commentary) matching the requested schema.`;

function buildUserPrompt(seg: LingoSegment, opts: GenerateOptions): string {
  const flavor: string[] = [];
  if (opts.learningGoal) flavor.push(`Learning goal: ${opts.learningGoal}.`);
  if (opts.interests && opts.interests.length > 0) {
    flavor.push(`Interests to lightly draw on: ${opts.interests.join(", ")}.`);
  }
  return `Create today's OneLingo lesson.

Target language (examples in this): ${seg.targetLanguage}
Native/explanation language (explanations in this): ${seg.nativeLanguage}
Level: ${seg.level}
${flavor.join("\n")}

Return JSON with EXACTLY these fields:
{
  "title": string,            // short internal title, e.g. "Ordering coffee"
  "subject": string,          // email subject, e.g. "Today's OneLingo: ordering coffee"
  "previewText": string,      // ~80 char preheader
  "openingLine": string,      // warm 1-sentence intro in the NATIVE language
  "lessonTitle": string,      // today's tiny lesson topic
  "lessonIntro": string,      // 1-2 sentences in the NATIVE language
  "words": [                  // 3 to 5 items
    { "word": string, "pronunciation": string, "meaning": string, "example": string }
  ],
  "phrases": [                // 1 to 2 items
    { "phrase": string, "translation": string, "whenToUse": string }
  ],
  "grammarNote": { "title": string, "explanation": string },  // ONE small note
  "exercises": [              // 2 to 3 items
    { "kind": "fill-blank"|"translate"|"choose", "prompt": string, "answer": string }
  ],
  "oneThingToRemember": string,   // short takeaway in the NATIVE language
  "tomorrowHint": string          // optional, may be ""
}`;
}

/* ----------------------------------------------------------------------- */
/* Provider calls                                                          */
/* ----------------------------------------------------------------------- */

async function callJson(system: string, user: string): Promise<{ raw: unknown | null; provider: string | null; model: string | null }> {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();

  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const model = process.env.AI_MODEL || "claude-3-5-haiku-latest";
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await client.messages.create({
        model,
        max_tokens: 2048,
        temperature: 0.4,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = res.content?.[0];
      const text = block && "text" in block ? block.text : "";
      return { raw: text ? safeJson(text) : null, provider: "anthropic", model };
    } catch (err) {
      console.error("[lingo/generator] anthropic call failed:", errMsg(err));
      return { raw: null, provider: "anthropic", model };
    }
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const text = res.choices?.[0]?.message?.content ?? "";
      return { raw: text ? safeJson(text) : null, provider: "openai", model };
    } catch (err) {
      console.error("[lingo/generator] openai call failed:", errMsg(err));
      return { raw: null, provider: "openai", model };
    }
  }

  return { raw: null, provider: null, model: null };
}

/* ----------------------------------------------------------------------- */
/* Public entry                                                            */
/* ----------------------------------------------------------------------- */

export async function generateLingoLesson(
  seg: LingoSegment,
  opts: GenerateOptions = {},
): Promise<GeneratedLingoLesson> {
  const isProd = process.env.NODE_ENV === "production";
  const { raw, provider, model } = await callJson(SYSTEM_PROMPT, buildUserPrompt(seg, opts));

  const parsed = raw ? parseLesson(raw, seg) : null;
  if (parsed) {
    return {
      ...parsed,
      generated: true,
      provider,
      model,
      metadata: { source: "ai", provider, model },
    };
  }

  // No usable AI output. In dev (or when explicitly allowed) use the heuristic.
  const allowFallback = !isProd || opts.allowProdFallback === true;
  if (allowFallback) {
    const lesson = heuristicLesson(seg, opts);
    return {
      ...lesson,
      generated: true,
      provider: "heuristic",
      model: "heuristic",
      metadata: { source: "heuristic", aiAttempted: provider !== null },
    };
  }

  // Production without AI: do not fabricate content.
  return {
    title: `${seg.targetLanguage} practice (${seg.level})`,
    subject: `Today's OneLingo: ${seg.targetLanguage} practice`,
    previewText: "",
    content: emptyContent(),
    generated: false,
    provider,
    model,
    metadata: { source: "none", reason: "ai_unavailable_in_production" },
  };
}

/* ----------------------------------------------------------------------- */
/* Parsing / validation                                                    */
/* ----------------------------------------------------------------------- */

function parseLesson(raw: unknown, seg: LingoSegment): Omit<GeneratedLingoLesson, "generated" | "provider" | "model" | "metadata"> | null {
  if (!isRecord(raw)) return null;

  const words = clampArray(raw.words, 3, 5, parseWord);
  const phrases = clampArray(raw.phrases, 1, 2, parsePhrase);
  const exercises = clampArray(raw.exercises, 2, 3, parseExercise);
  if (words.length < 1 || phrases.length < 1 || exercises.length < 1) return null;

  const grammarRaw = isRecord(raw.grammarNote) ? raw.grammarNote : {};
  const content: LingoLessonContent = {
    openingLine: str(raw.openingLine, ""),
    lessonTitle: str(raw.lessonTitle, "Today's practice"),
    lessonIntro: str(raw.lessonIntro, ""),
    words,
    phrases,
    grammarNote: {
      title: str(grammarRaw.title, "Grammar note"),
      explanation: str(grammarRaw.explanation, ""),
    },
    exercises,
    oneThingToRemember: str(raw.oneThingToRemember, ""),
    tomorrowHint: str(raw.tomorrowHint, "") || undefined,
  };

  const title = str(raw.title, `${seg.targetLanguage} practice`);
  const subject = str(raw.subject, `Today's OneLingo: ${title}`);
  const previewText = str(raw.previewText, content.lessonIntro).slice(0, 140);

  if (subject.length < 4 || content.grammarNote.explanation.length < 3) return null;

  return { title, subject, previewText, content };
}

function parseWord(v: unknown): LingoWord | null {
  if (!isRecord(v)) return null;
  const word = str(v.word, "");
  const meaning = str(v.meaning, "");
  const example = str(v.example, "");
  if (!word || !meaning) return null;
  const pronunciation = str(v.pronunciation, "");
  return { word, meaning, example, ...(pronunciation ? { pronunciation } : {}) };
}

function parsePhrase(v: unknown): LingoPhrase | null {
  if (!isRecord(v)) return null;
  const phrase = str(v.phrase, "");
  const translation = str(v.translation, "");
  if (!phrase || !translation) return null;
  return { phrase, translation, whenToUse: str(v.whenToUse, "") };
}

function parseExercise(v: unknown): LingoExercise | null {
  if (!isRecord(v)) return null;
  const prompt = str(v.prompt, "");
  const answer = str(v.answer, "");
  if (!prompt || !answer) return null;
  const kind = str(v.kind, "translate");
  return { kind, prompt, answer };
}

function emptyContent(): LingoLessonContent {
  return {
    openingLine: "",
    lessonTitle: "",
    lessonIntro: "",
    words: [],
    phrases: [],
    grammarNote: { title: "", explanation: "" },
    exercises: [],
    oneThingToRemember: "",
  };
}

/* ----------------------------------------------------------------------- */
/* Small helpers                                                           */
/* ----------------------------------------------------------------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, dflt: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : dflt;
}

function clampArray<T>(
  v: unknown,
  min: number,
  max: number,
  parse: (item: unknown) => T | null,
): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const item of v) {
    if (out.length >= max) break;
    const parsed = parse(item);
    if (parsed) out.push(parsed);
  }
  return out.length >= min || out.length === v.length ? out : out;
}

function safeJson(text: string): unknown | null {
  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
