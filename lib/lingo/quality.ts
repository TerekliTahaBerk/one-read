/**
 * OneRead — OneLingo quality gates.
 *
 * Composes the shared gates (banned phrases / placeholder / JSON leak) with
 * OneLingo-specific checks (Phase 9):
 *  - target-language examples present (every word + phrase has an example)
 *  - native-language explanations present (grammar note + word meanings)
 *  - answer key present (every exercise has an answer)
 */

import { runSharedGates, toReport, type GateFinding, type GateReport } from "@/lib/ai";
import type { LingoLessonContent } from "./types";

export function runLingoGates(content: LingoLessonContent): GateReport {
  const findings: GateFinding[] = runSharedGates(content, { maxFieldLength: 600 });

  // Target-language examples present.
  if (content.words.length < 3) {
    findings.push({ severity: "error", code: "too_few_words", field: "words", message: "Lesson needs at least 3 words." });
  }
  content.words.forEach((w, i) => {
    if (!w.example?.trim())
      findings.push({ severity: "error", code: "missing_example", field: `words[${i}].example`, message: "Word is missing a target-language example." });
    if (!w.meaning?.trim())
      findings.push({ severity: "error", code: "missing_meaning", field: `words[${i}].meaning`, message: "Word is missing a native-language meaning." });
  });

  if (content.phrases.length < 1) {
    findings.push({ severity: "error", code: "no_phrases", field: "phrases", message: "Lesson needs at least 1 phrase." });
  }
  content.phrases.forEach((p, i) => {
    if (!p.phrase?.trim())
      findings.push({ severity: "error", code: "missing_phrase", field: `phrases[${i}].phrase`, message: "Phrase is empty." });
    if (!p.translation?.trim())
      findings.push({ severity: "error", code: "missing_translation", field: `phrases[${i}].translation`, message: "Phrase is missing a native-language translation." });
  });

  // Native-language explanation present.
  if (!content.grammarNote?.explanation?.trim()) {
    findings.push({ severity: "error", code: "missing_grammar", field: "grammarNote.explanation", message: "Grammar note explanation is empty." });
  }

  // Answer key present.
  if (content.exercises.length < 2) {
    findings.push({ severity: "error", code: "too_few_exercises", field: "exercises", message: "Lesson needs at least 2 exercises." });
  }
  content.exercises.forEach((e, i) => {
    if (!e.answer?.trim())
      findings.push({ severity: "error", code: "missing_answer", field: `exercises[${i}].answer`, message: "Exercise is missing its answer-key answer." });
    if (!e.prompt?.trim())
      findings.push({ severity: "error", code: "missing_prompt", field: `exercises[${i}].prompt`, message: "Exercise prompt is empty." });
  });

  return toReport(findings);
}
