/**
 * OneRead — OneLingo Gemini brain test (no DB write, no email).
 *
 * Generates sample daily lessons for a few segments and prints validation
 * status, provider/model, quality-gate warnings, and a content summary. It does
 * NOT write to the database and NEVER sends email.
 *
 * Usage:
 *   npm run ai:test:lingo
 *
 * If GEMINI_API_KEY is not configured, the script skips live generation
 * gracefully (no network call) and exits cleanly.
 */

import { generateLingoLesson } from "../lib/lingo/generator";
import { runLingoGates } from "../lib/lingo/quality";
import type { LingoSegment } from "../lib/lingo/segments";
import { geminiConfigured } from "../lib/ai";
import { getLlmStatus } from "../lib/llm";

const SEGMENTS: Array<{ seg: LingoSegment; label: string }> = [
  { seg: { targetLanguage: "English", nativeLanguage: "Turkish", level: "Beginner" }, label: "English ← Turkish / Beginner" },
  { seg: { targetLanguage: "Spanish", nativeLanguage: "English", level: "Intermediate" }, label: "Spanish ← English / Intermediate" },
  { seg: { targetLanguage: "French", nativeLanguage: "Turkish", level: "Elementary" }, label: "French ← Turkish / Elementary" },
];

async function main() {
  const status = getLlmStatus();
  console.log(
    `[ai:test:lingo] provider=${status.provider} model=${status.model} gemini=${geminiConfigured() ? "configured" : "MISSING"}`,
  );
  console.log("[ai:test:lingo] no email, no DB write\n");

  if (status.provider === "gemini" && !geminiConfigured()) {
    console.log(
      "SKIPPED: AI_PROVIDER=gemini but GEMINI_API_KEY is not set locally. No network call made.",
    );
    console.log(
      "Run in Preview/Production where GEMINI_API_KEY is available, or add it to .env.",
    );
    return;
  }

  let failures = 0;
  for (const { seg, label } of SEGMENTS) {
    console.log(`========== ${label} ==========`);
    const t0 = Date.now();
    const lesson = await generateLingoLesson(seg, {});
    const ms = Date.now() - t0;

    if (!lesson.generated) {
      console.log(`  NOT GENERATED (${ms}ms) — provider=${lesson.provider} reason=${JSON.stringify(lesson.metadata)}\n`);
      failures++;
      continue;
    }

    const gate = runLingoGates(lesson.content);
    console.log(`  generated in ${ms}ms · provider=${lesson.provider} model=${lesson.model ?? "—"}`);
    console.log(`  validation : ${gate.ok ? "VALID" : "FAILED"}`);
    console.log(`  subject    : ${lesson.subject}`);
    console.log(`  micro-topic: ${lesson.content.lessonTitle}`);
    console.log(`  words      : ${lesson.content.words.length} · phrases: ${lesson.content.phrases.length} · exercises: ${lesson.content.exercises.length}`);
    const allExamples = lesson.content.words.every((w) => w.example.trim().length > 0);
    const allAnswers = lesson.content.exercises.every((e) => e.answer.trim().length > 0);
    console.log(`  target examples present: ${allExamples} · answer key complete: ${allAnswers}`);
    if (lesson.content.words[0]) {
      const w = lesson.content.words[0];
      console.log(`  sample word: "${w.word}" — ${w.meaning} · ex: ${w.example}`);
    }
    if (gate.warnings.length > 0) {
      console.log(`  warnings:\n${gate.warnings.map((w) => "    - " + w).join("\n")}`);
    }
    if (!gate.ok) failures++;
    console.log("");
  }

  if (failures > 0) {
    console.log(`Completed with ${failures} segment(s) failing validation.`);
    process.exitCode = 1;
  } else {
    console.log("All segments generated and passed validation.");
  }
}

main().catch((err) => {
  console.error("[ai:test:lingo] error:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
