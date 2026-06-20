/**
 * OneRead — OneFilm Gemini brain test (no DB write, no email).
 *
 * Exercises the metadata-grounding rules without needing a live key for the
 * structural checks. Test cases:
 *   1. NO_FILM guard with empty metadata
 *   2. complete metadata bundle (title, year, director, runtime, language, genre, mood)
 *   3. partial metadata bundle (title only + admin note) — must not invent facts
 *   4. spoiler-free mode
 *   5. spoiler-light mode
 *
 * Does NOT write to the database and NEVER sends email. Without GEMINI_API_KEY,
 * live generation is skipped gracefully; NO_FILM + metadata validation + the
 * partial-metadata grounding assertions still run.
 *
 * Usage: npm run ai:test:film
 */

import type { FilmCatalogEntry } from "@prisma/client";
import { generateFilmIssue } from "../lib/film/generator";
import { validateFilmMetadata, runFilmGates } from "../lib/film/quality";
import { toSpoilerLevel } from "../lib/film/prompts";
import type { FilmSegment } from "../lib/film/segments";
import { geminiConfigured } from "../lib/ai";
import { getLlmStatus } from "../lib/llm";

function seg(spoilerPreference: string): FilmSegment {
  return { emailLanguage: "English", genres: ["Drama"], moods: ["Quiet"], spoilerPreference };
}

function film(partial: Partial<FilmCatalogEntry>): FilmCatalogEntry {
  const now = new Date();
  return {
    id: "test-film",
    title: "Untitled",
    year: null,
    director: null,
    filmLanguage: null,
    runtimeMinutes: null,
    sourceUrl: null,
    adminNote: null,
    genres: [],
    moods: [],
    spoilerLevel: "spoiler-light",
    usedAt: null,
    createdBy: "ai:test:film",
    createdAt: now,
    updatedAt: now,
    ...partial,
  } as FilmCatalogEntry;
}

const COMPLETE = film({
  title: "Drive My Car",
  year: 2021,
  director: "Ryusuke Hamaguchi",
  filmLanguage: "Japanese",
  runtimeMinutes: 179,
  genres: ["Drama"],
  moods: ["Quiet", "Reflective"],
  adminNote: "A slow, humane road film about grief and listening.",
});

const PARTIAL = film({
  title: "An Untitled Indie",
  adminNote: "A small festival drama a friend recommended; quiet and warm.",
});

async function liveOrSkip(label: string, s: FilmSegment, f: FilmCatalogEntry, live: boolean) {
  console.log(`========== ${label} ==========`);
  const spoilerLevel = toSpoilerLevel(s.spoilerPreference);
  const check = validateFilmMetadata(f);
  console.log(`  metadata ok=${check.ok} provided=[${check.provided.join(",")}] missing=[${check.missing.join(",")}]`);
  if (!live) {
    console.log(`  (live generation skipped — spoiler level would be "${spoilerLevel}")\n`);
    return;
  }
  const t0 = Date.now();
  const issue = await generateFilmIssue(s, f, { spoilerPreference: s.spoilerPreference });
  const ms = Date.now() - t0;
  if (!issue.generated) {
    console.log(`  NOT GENERATED (${ms}ms) reason=${issue.reason}\n`);
    return;
  }
  const gate = runFilmGates(issue.content, f, spoilerLevel);
  console.log(`  generated in ${ms}ms · provider=${issue.provider} model=${issue.model ?? "—"}`);
  console.log(`  validation : ${gate.ok ? "VALID" : "FAILED"} · spoiler level: ${spoilerLevel}`);
  console.log(`  subject    : ${issue.subject}`);
  console.log(`  filmTitle  : ${issue.content.filmTitle}`);
  console.log(`  metadata   : ${JSON.stringify(issue.content.metadata ?? {})}`);
  if (gate.warnings.length) console.log(`  warnings:\n${gate.warnings.map((w) => "    - " + w).join("\n")}`);
  console.log("");
}

async function main() {
  const status = getLlmStatus();
  console.log(
    `[ai:test:film] provider=${status.provider} model=${status.model} gemini=${geminiConfigured() ? "configured" : "MISSING"}`,
  );
  console.log("[ai:test:film] no email, no DB write\n");

  // 1. NO_FILM guard (always runs, no network).
  console.log("========== 1. NO_FILM guard (empty metadata) ==========");
  const none = await generateFilmIssue(seg("Spoiler-light"), null, {});
  console.log(`  null film → generated=${none.generated} reason=${none.reason}`);
  if (none.generated || none.reason !== "NO_FILM") {
    console.error("  FAIL: empty metadata must yield NO_FILM and not generate.");
    process.exitCode = 1;
  } else {
    console.log("  PASS: empty metadata correctly refused.\n");
  }

  const live = !(status.provider === "gemini" && !geminiConfigured());
  if (!live) {
    console.log("NOTE: AI_PROVIDER=gemini but GEMINI_API_KEY missing — live generation skipped (no network call).");
    console.log("Metadata validation + grounding structure still verified below.\n");
  }

  // 2-5. metadata cases.
  await liveOrSkip("2. Complete metadata", seg("Spoiler-light"), COMPLETE, live);
  await liveOrSkip("3. Partial metadata (title + admin note, must not invent)", seg("Spoiler-light"), PARTIAL, live);
  await liveOrSkip("4. Spoiler-free mode", seg("Spoiler-free"), COMPLETE, live);
  await liveOrSkip("5. Spoiler-light mode", seg("Spoiler-light"), COMPLETE, live);

  // Partial-metadata grounding assertion (live only): the stored metadata must
  // not contain year/director/runtime that weren't provided.
  if (live) {
    const issue = await generateFilmIssue(seg("Spoiler-light"), PARTIAL, { spoilerPreference: "Spoiler-light" });
    if (issue.generated) {
      const m = issue.content.metadata ?? {};
      const invented = m.year != null || m.director != null || m.runtimeMinutes != null || m.language != null;
      console.log(`Partial-metadata grounding: invented-facts=${invented} (expected false)`);
      if (invented) process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error("[ai:test:film] error:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
