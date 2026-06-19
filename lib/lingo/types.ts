/**
 * Strict shape of a OneLingo daily lesson's structured content (stored in
 * LingoDailyLesson.contentJson). Explanations are written in the learner's
 * native language; examples are in the target language. The generator and
 * parser both enforce this shape — the pipeline never trusts the raw model
 * output.
 */

export interface LingoWord {
  /** The word/term in the target language. */
  word: string;
  /** Optional pronunciation or transliteration aid. */
  pronunciation?: string;
  /** Meaning, written in the native language. */
  meaning: string;
  /** Example sentence in the target language. */
  example: string;
}

export interface LingoPhrase {
  /** The phrase in the target language. */
  phrase: string;
  /** Natural translation in the native language. */
  translation: string;
  /** When to use it (native language). */
  whenToUse: string;
}

export interface LingoExercise {
  /** "fill-blank" | "translate" | "choose" — drives a small label only. */
  kind: string;
  /** The exercise prompt (may mix languages). */
  prompt: string;
  /** The answer, revealed in the answer key. */
  answer: string;
}

export interface LingoLessonContent {
  /** Warm short intro in the native language. */
  openingLine: string;
  /** Micro-topic title for today's tiny lesson. */
  lessonTitle: string;
  /** 1–2 sentence framing of the tiny lesson (native language). */
  lessonIntro: string;
  /** 3–5 useful words. */
  words: LingoWord[];
  /** 1–2 useful phrases. */
  phrases: LingoPhrase[];
  /** One small, level-appropriate grammar note. */
  grammarNote: { title: string; explanation: string };
  /** 2–3 short exercises with answers. */
  exercises: LingoExercise[];
  /** Short takeaway (native language). */
  oneThingToRemember: string;
  /** Optional "tomorrow we'll…" line. */
  tomorrowHint?: string;
}

/** Top-level generated lesson: email framing + structured content + provenance. */
export interface GeneratedLingoLesson {
  title: string;
  subject: string;
  previewText: string;
  content: LingoLessonContent;
  /** False when generation was not possible (e.g. no AI provider in prod). */
  generated: boolean;
  provider: string | null;
  model: string | null;
  /** Free-form provenance for admin/debugging. */
  metadata: Record<string, unknown>;
}
