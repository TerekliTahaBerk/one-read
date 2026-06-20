/**
 * OneRead — OneArticle Gemini brain test (no DB write, no email).
 *
 * Generates ONE article brief from a provided/manual source and prints the
 * validation status, confidence, quality-gate warnings, and which source
 * material was used. It does NOT write to the database and NEVER sends email.
 *
 * Usage:
 *   npm run ai:test:article
 *   npm run ai:test:article -- --lang Turkish
 *   npm run ai:test:article -- --url https://example.com/post --source "Example" \
 *        --title "A title" --text-file ./article.txt
 *
 * If GEMINI_API_KEY is not configured, the script reports that live generation
 * was skipped (it makes no network call) and exits cleanly.
 */

import { readFileSync } from "node:fs";
import { getLlmProvider, getLlmStatus } from "../lib/llm";
import { geminiConfigured } from "../lib/ai";

const SAMPLE_TEXT = `Small teams often ship faster than large ones, not because they work harder, but because they spend less time coordinating. Every additional person on a project adds communication overhead: more meetings, more context to share, more decisions to align. Past a certain size, the cost of keeping everyone in sync outweighs the extra output each new hire brings. The most effective engineering organizations tend to keep teams small and give them clear ownership over a well-defined surface area. When a team owns its domain end to end, it can make decisions locally without waiting for sign-off from elsewhere. This autonomy is what actually produces speed. The lesson is not that big companies cannot move quickly, but that they must deliberately structure themselves into small, autonomous units to do so. Coordination is a tax, and the goal is to pay as little of it as possible while still shipping coherent products.`;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const lang = argValue("--lang") ?? "English";
  const title = argValue("--title") ?? "Why small teams ship faster";
  const url = argValue("--url") ?? "https://oneread.example/manual-test";
  const sourceName = argValue("--source") ?? "Manual Test Source";
  const textFile = argValue("--text-file");
  const text = textFile ? readFileSync(textFile, "utf8") : SAMPLE_TEXT;

  const status = getLlmStatus();
  console.log(
    `[ai:test:article] provider=${status.provider} model=${status.model} gemini=${geminiConfigured() ? "configured" : "MISSING"}`,
  );
  console.log(`[ai:test:article] lang=${lang} source="${sourceName}" url=${url}`);
  console.log(`[ai:test:article] source text length=${text.length} chars (no email, no DB write)`);

  if (status.provider === "gemini" && !geminiConfigured()) {
    console.log(
      "\nSKIPPED: AI_PROVIDER=gemini but GEMINI_API_KEY is not set locally. No network call made.",
    );
    console.log(
      "Run this in an environment where GEMINI_API_KEY is available (Preview/Production), or add it to .env.",
    );
    return;
  }

  const provider = getLlmProvider();
  if (!provider) {
    console.log("\nSKIPPED: no AI provider configured. Set AI_PROVIDER=gemini + GEMINI_API_KEY.");
    return;
  }

  const t0 = Date.now();
  const summary = await provider.summarize({
    title,
    sourceName,
    url,
    sourceLanguage: "English",
    targetLanguage: lang,
    primaryTopic: "engineering",
    difficulty: "intermediate",
    cleanedText: text,
    rawExcerpt: text.slice(0, 400),
  });
  const ms = Date.now() - t0;

  if (!summary) {
    console.log(`\nRESULT: generation FAILED or rejected (null). ${ms}ms`);
    process.exitCode = 1;
    return;
  }

  const valid = summary.confidence >= 1; // confidence forced to 0 on gate failure
  console.log(`\nRESULT: generated in ${ms}ms`);
  console.log(`  validation : ${valid ? "VALID" : "REJECTED (gate/low-confidence)"}`);
  console.log(`  confidence : ${summary.confidence}`);
  console.log(`  subject    : ${summary.subject}`);
  console.log(`  hook       : ${summary.oneLineHook}`);
  console.log(`  why        : ${summary.whyThisArticle}`);
  console.log(`  source url : ${summary.originalUrl} (preserved=${summary.originalUrl === url})`);
  console.log(`  3-sentence :`);
  summary.threeSentenceSummary.forEach((s, i) => console.log(`    ${i + 1}. ${s}`));
  console.log(`  takeaways  :`);
  summary.keyTakeaways.forEach((s, i) => console.log(`    - ${s}`));
  if (summary.editorNotes) {
    console.log(`  notes/warnings:\n${summary.editorNotes.split("\n").map((l) => "    " + l).join("\n")}`);
  }
}

main()
  .catch((err) => {
    console.error("[ai:test:article] error:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
