/**
 * OneRead — OneLingo prompt module (Gemini brain).
 *
 * Versioned prompt + Zod schema for a single daily language lesson. Output
 * shape matches the existing `LingoLessonContent` (see lib/lingo/types.ts) so
 * the email template + admin renderer are unchanged — we keep current shapes
 * and enrich the brain behind them.
 *
 * Explanations are in the NATIVE language; examples are in the TARGET language.
 */

import { z } from "zod";
import type { LingoSegment } from "./segments";

/** Bump when the prompt or schema changes in a way that affects output. */
export const LINGO_PROMPT_VERSION = "lingo-lesson/v1-gemini";

export interface LingoPromptOptions {
  learningGoal?: string | null;
  interests?: string[];
}

export const LINGO_SYSTEM_PROMPT = `You are OneLingo, a calm, practical language tutor who prepares ONE short daily practice email (about 5 minutes).

ROLE & TONE:
- Calm, practical, premium, useful. Never childish, gamified, academic-heavy, or generic.
- A focused micro-topic per lesson — not a random word dump.

HARD RULES:
- Return ONE JSON object. No prose, no markdown, no code fences.
- Explanations, meanings, intros, and takeaways are written in the NATIVE language.
- Words, phrases, and example sentences are in the TARGET language. Every word and phrase MUST include a real example sentence in the target language.
- Be strictly level-appropriate: beginners get simple, encouraging content; advanced learners are not condescended to.
- NEVER invent grammar rules or state false facts. If unsure, keep it simple and correct.
- Use real-life contexts, natural phrasing — no unnatural textbook sentences.
- Include an answer key: every exercise MUST have a correct answer.
- Do not overload: 3–5 words, 1–2 phrases, 2–3 exercises, ONE small grammar note.
- No offensive, medical, legal, political, or stereotyping content. No cultural stereotypes.

FORBIDDEN OUTPUT:
- Gamified/noisy tone, emojis, hype.
- Marketing/AI-slop phrases ("unlock", "supercharge", "seamless", "dive into", "AI-powered", etc.).
- Incorrect grammar claims.`;

export function buildLingoUserPrompt(
  seg: LingoSegment,
  opts: LingoPromptOptions,
): string {
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
  "subject": string,          // email subject
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
}

Constraints:
- "meaning" of each word is in ${seg.nativeLanguage}; "word"/"example" are in ${seg.targetLanguage}.
- "translation" of each phrase is in ${seg.nativeLanguage}; "phrase" is in ${seg.targetLanguage}.
- Explanations/intros/takeaways are in ${seg.nativeLanguage}.
- Keep the whole thing doable in ~5 minutes.`;
}

/* ----------------------------------------------------------------------- */
/* Schema (Zod)                                                             */
/* ----------------------------------------------------------------------- */

const nonEmpty = z.string().trim().min(1);

const WordSchema = z.object({
  word: nonEmpty,
  pronunciation: z.string().trim().optional().default(""),
  meaning: nonEmpty,
  example: nonEmpty,
});

const PhraseSchema = z.object({
  phrase: nonEmpty,
  translation: nonEmpty,
  whenToUse: z.string().trim().default(""),
});

const ExerciseSchema = z.object({
  kind: z.string().trim().default("translate"),
  prompt: nonEmpty,
  answer: nonEmpty,
});

export const LingoLessonSchema = z.object({
  title: z.string().trim().default(""),
  subject: nonEmpty.min(4),
  previewText: z.string().trim().default(""),
  openingLine: z.string().trim().default(""),
  lessonTitle: z.string().trim().default("Today's practice"),
  lessonIntro: z.string().trim().default(""),
  words: z.array(WordSchema).min(3).max(8),
  phrases: z.array(PhraseSchema).min(1).max(4),
  grammarNote: z.object({
    title: z.string().trim().default("Grammar note"),
    explanation: nonEmpty.min(3),
  }),
  exercises: z.array(ExerciseSchema).min(2).max(5),
  oneThingToRemember: z.string().trim().default(""),
  tomorrowHint: z.string().trim().optional().default(""),
});

export type LingoLessonValidated = z.infer<typeof LingoLessonSchema>;
