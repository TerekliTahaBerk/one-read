import {
  generateJsonWithGemini,
  geminiConfigured,
  buildGenerationMeta,
  stableHash,
} from "@/lib/ai";
import type { LingoSegment } from "./segments";
import { heuristicLesson } from "./heuristic";
import {
  LINGO_PROMPT_VERSION,
  LINGO_SYSTEM_PROMPT,
  LingoLessonSchema,
  buildLingoUserPrompt,
  type LingoLessonValidated,
} from "./prompts";
import { runLingoGates } from "./quality";
import type {
  GeneratedLingoLesson,
  LingoExercise,
  LingoLessonContent,
  LingoPhrase,
  LingoWord,
} from "./types";

/**
 * OneLingo lesson generator. Produces a single day's lesson for a segment
 * (targetLanguage + nativeLanguage + level) as strict, schema-validated JSON,
 * via the SHARED Gemini provider (lib/ai). Falls back to a deterministic
 * heuristic lesson in development. In production without Gemini it returns
 * `generated: false` so the pipeline marks the lesson NOT_GENERATED (no silent
 * fake content) unless `allowProdFallback` is explicitly set.
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

export async function generateLingoLesson(
  seg: LingoSegment,
  opts: GenerateOptions = {},
): Promise<GeneratedLingoLesson> {
  const isProd = process.env.NODE_ENV === "production";
  const inputHash = stableHash({
    seg,
    learningGoal: opts.learningGoal ?? null,
    interests: opts.interests ?? [],
    promptVersion: LINGO_PROMPT_VERSION,
  });

  if (geminiConfigured()) {
    const result = await generateJsonWithGemini(
      buildLingoUserPrompt(seg, opts),
      LingoLessonSchema,
      {
        product: "one-lingo",
        task: "lingo-lesson",
        tier: "quality",
        system: LINGO_SYSTEM_PROMPT,
        promptVersion: LINGO_PROMPT_VERSION,
      },
    );

    if (result.ok) {
      const { title, subject, previewText, content } = mapLesson(result.data, seg);
      const gate = runLingoGates(content);
      if (gate.ok) {
        return {
          title,
          subject,
          previewText,
          content,
          generated: true,
          provider: "gemini",
          model: result.model,
          metadata: metaRecord({
            provider: "gemini",
            model: result.model,
            promptVersion: LINGO_PROMPT_VERSION,
            inputHash,
            source: "ai",
            validationStatus: "VALID",
            warnings: gate.warnings.length ? gate.warnings : undefined,
            repaired: result.repaired,
          }),
        };
      }
      // Valid JSON but failed a hard quality gate — do not send it.
      console.error(
        `[lingo/generator] quality gate failed (${seg.targetLanguage}/${seg.level}): ${gate.warnings.join(" | ")}`,
      );
      const fellBack = fallbackOrNull(seg, opts, isProd, inputHash, {
        provider: "gemini",
        model: result.model,
        validationStatus: "INVALID",
        warnings: gate.warnings,
        error: "quality_gate_failed",
      });
      if (fellBack) return fellBack;
    } else {
      console.error(`[lingo/generator] gemini failed: ${result.kind} — ${result.message}`);
      const fellBack = fallbackOrNull(seg, opts, isProd, inputHash, {
        provider: "gemini",
        model: result.model ?? null,
        validationStatus: "SKIPPED",
        error: `${result.kind}: ${result.message}`,
      });
      if (fellBack) return fellBack;
    }

    // Production, no fallback allowed → do not fabricate.
    return notGenerated(seg, inputHash, {
      provider: "gemini",
      validationStatus: "SKIPPED",
      error: "generation_failed_in_production",
    });
  }

  // Gemini not configured.
  const fellBack = fallbackOrNull(seg, opts, isProd, inputHash, {
    provider: null,
    model: null,
    validationStatus: "SKIPPED",
    error: "gemini_not_configured",
  });
  if (fellBack) return fellBack;

  return notGenerated(seg, inputHash, {
    provider: null,
    validationStatus: "SKIPPED",
    error: "ai_unavailable_in_production",
  });
}

/** Provenance is stored in the free-form `metadata` Json column. */
function metaRecord(
  partial: Parameters<typeof buildGenerationMeta>[0],
): Record<string, unknown> {
  return buildGenerationMeta(partial) as unknown as Record<string, unknown>;
}

/* ----------------------------------------------------------------------- */
/* Fallback helpers                                                         */
/* ----------------------------------------------------------------------- */

function fallbackOrNull(
  seg: LingoSegment,
  opts: GenerateOptions,
  isProd: boolean,
  inputHash: string,
  meta: {
    provider: string | null;
    model?: string | null;
    validationStatus: "VALID" | "INVALID" | "SKIPPED";
    warnings?: string[];
    error?: string;
  },
): GeneratedLingoLesson | null {
  const allowFallback = !isProd || opts.allowProdFallback === true;
  if (!allowFallback) return null;
  const lesson = heuristicLesson(seg, opts);
  return {
    ...lesson,
    generated: true,
    provider: "heuristic",
    model: "heuristic",
    metadata: metaRecord({
      provider: meta.provider,
      model: meta.model ?? null,
      promptVersion: LINGO_PROMPT_VERSION,
      inputHash,
      source: "heuristic",
      validationStatus: meta.validationStatus,
      warnings: meta.warnings,
      error: meta.error,
    }),
  };
}

function notGenerated(
  seg: LingoSegment,
  inputHash: string,
  meta: {
    provider: string | null;
    validationStatus: "VALID" | "INVALID" | "SKIPPED";
    error?: string;
  },
): GeneratedLingoLesson {
  return {
    title: `${seg.targetLanguage} practice (${seg.level})`,
    subject: `Today's OneLingo: ${seg.targetLanguage} practice`,
    previewText: "",
    content: emptyContent(),
    generated: false,
    provider: meta.provider,
    model: null,
    metadata: metaRecord({
      provider: meta.provider,
      model: null,
      promptVersion: LINGO_PROMPT_VERSION,
      inputHash,
      source: "none",
      validationStatus: meta.validationStatus,
      error: meta.error,
    }),
  };
}

/* ----------------------------------------------------------------------- */
/* Mapping (validated → stored content shape)                               */
/* ----------------------------------------------------------------------- */

function mapLesson(
  d: LingoLessonValidated,
  seg: LingoSegment,
): { title: string; subject: string; previewText: string; content: LingoLessonContent } {
  const words: LingoWord[] = d.words.map((w) => ({
    word: w.word,
    meaning: w.meaning,
    example: w.example,
    ...(w.pronunciation ? { pronunciation: w.pronunciation } : {}),
  }));
  const phrases: LingoPhrase[] = d.phrases.map((p) => ({
    phrase: p.phrase,
    translation: p.translation,
    whenToUse: p.whenToUse ?? "",
  }));
  const exercises: LingoExercise[] = d.exercises.map((e) => ({
    kind: e.kind || "translate",
    prompt: e.prompt,
    answer: e.answer,
  }));

  const content: LingoLessonContent = {
    openingLine: d.openingLine ?? "",
    lessonTitle: d.lessonTitle || "Today's practice",
    lessonIntro: d.lessonIntro ?? "",
    words,
    phrases,
    grammarNote: {
      title: d.grammarNote.title || "Grammar note",
      explanation: d.grammarNote.explanation,
    },
    exercises,
    oneThingToRemember: d.oneThingToRemember ?? "",
    ...(d.tomorrowHint ? { tomorrowHint: d.tomorrowHint } : {}),
  };

  const title = d.title || `${seg.targetLanguage} practice`;
  const subject = d.subject || `Today's OneLingo: ${title}`;
  const previewText = (d.previewText || content.lessonIntro).slice(0, 140);
  return { title, subject, previewText, content };
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
