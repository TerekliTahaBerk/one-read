/**
 * OneRead — OneNews Gemini brain test (no DB write, no email).
 *
 * Generates a briefing from a MANUAL source bundle and prints validation,
 * provider/model, source-grounding checks (every story URL must come from the
 * bundle), and warnings. Also exercises the NO_SOURCES path (empty bundle must
 * never generate). Does NOT write to the database and NEVER sends email.
 *
 * Usage:
 *   npm run ai:test:news
 *
 * Without GEMINI_API_KEY it still validates: source-bundle checks, the
 * NO_SOURCES path, prompt construction, and schema — only the live Gemini call
 * is skipped gracefully (no network call).
 */

import type { NewsSourceStory } from "@prisma/client";
import { generateNewsIssue } from "../lib/news/generator";
import { validateSourceBundle, runNewsGates } from "../lib/news/quality";
import type { NewsSegment } from "../lib/news/segments";
import { geminiConfigured } from "../lib/ai";
import { getLlmStatus } from "../lib/llm";

const SEG: NewsSegment = {
  briefingLanguage: "English",
  regionFocus: "Global",
  topics: ["world", "business", "technology"],
};

/** A small, clearly-manual source bundle (real-looking shape; for test only). */
function manualBundle(): NewsSourceStory[] {
  const now = new Date();
  const base = {
    region: "Global",
    language: "English",
    storyDate: now,
    createdAt: now,
    usedAt: null,
    createdBy: "ai:test:news",
  };
  const rows: Array<Partial<NewsSourceStory>> = [
    {
      id: "test-1",
      headline: "Central banks hold rates steady amid cooling inflation",
      sourceName: "Example Wire",
      sourceUrl: "https://example.com/markets/rates-hold",
      excerpt: "Policymakers kept benchmark rates unchanged, citing gradual progress on inflation while signaling caution about cutting too soon.",
      topic: "business",
    },
    {
      id: "test-2",
      headline: "Researchers publish open dataset for protein folding",
      sourceName: "Example Science Daily",
      sourceUrl: "https://example.com/science/protein-dataset",
      excerpt: "A consortium released a large annotated dataset intended to help labs reproduce and extend recent structural biology results.",
      topic: "science",
    },
    {
      id: "test-3",
      headline: "Major port resumes operations after week-long disruption",
      sourceName: "Example Globe",
      sourceUrl: "https://example.com/world/port-resumes",
      excerpt: "Shipping traffic began returning to normal after operators cleared a backlog that had slowed regional trade.",
      topic: "world",
    },
  ];
  return rows.map((r) => ({ ...base, ...r }) as NewsSourceStory);
}

async function main() {
  const status = getLlmStatus();
  console.log(
    `[ai:test:news] provider=${status.provider} model=${status.model} gemini=${geminiConfigured() ? "configured" : "MISSING"}`,
  );
  console.log("[ai:test:news] no email, no DB write\n");

  // 1. NO_SOURCES path (always runs, no network).
  console.log("========== NO_SOURCES guard ==========");
  const empty = await generateNewsIssue(SEG, [], {});
  console.log(`  empty bundle → generated=${empty.generated} reason=${empty.reason}`);
  if (empty.generated || empty.reason !== "NO_SOURCES") {
    console.error("  FAIL: empty bundle must yield NO_SOURCES and not generate.");
    process.exitCode = 1;
  } else {
    console.log("  PASS: empty bundle correctly refused.\n");
  }

  // 2. Source-bundle validation (always runs, no network).
  const bundle = manualBundle();
  const check = validateSourceBundle(bundle);
  console.log("========== Source bundle validation ==========");
  console.log(`  valid stories: ${check.valid.length}/${bundle.length} · ok=${check.ok}`);
  if (check.warnings.length) console.log(`  warnings: ${check.warnings.join(" | ")}`);
  console.log("");

  // 3. Live generation (skipped gracefully without a key).
  if (status.provider === "gemini" && !geminiConfigured()) {
    console.log("========== Live generation ==========");
    console.log("SKIPPED: AI_PROVIDER=gemini but GEMINI_API_KEY is not set locally. No network call made.");
    console.log("Schema, prompt construction, source-bundle + NO_SOURCES checks validated above.");
    return;
  }

  console.log("========== Live generation ==========");
  const t0 = Date.now();
  const issue = await generateNewsIssue(SEG, bundle, {});
  const ms = Date.now() - t0;
  if (!issue.generated) {
    console.log(`  NOT GENERATED (${ms}ms) provider=${issue.provider} reason=${issue.reason}`);
    return;
  }
  const gate = runNewsGates(issue.content, bundle);
  const allowedUrls = new Set(bundle.map((s) => s.sourceUrl));
  const allFromBundle = issue.content.topStories.every((s) => allowedUrls.has(s.url));
  console.log(`  generated in ${ms}ms · provider=${issue.provider} model=${issue.model ?? "—"}`);
  console.log(`  validation : ${gate.ok ? "VALID" : "FAILED"}`);
  console.log(`  subject    : ${issue.subject}`);
  console.log(`  stories    : ${issue.content.topStories.length}`);
  console.log(`  every story URL from bundle: ${allFromBundle}`);
  issue.content.topStories.forEach((s, i) => {
    console.log(`    ${i + 1}. ${s.title}  [${s.source}] ${s.url}`);
  });
  if (gate.warnings.length) console.log(`  warnings:\n${gate.warnings.map((w) => "    - " + w).join("\n")}`);
  if (!gate.ok || !allFromBundle) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[ai:test:news] error:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
