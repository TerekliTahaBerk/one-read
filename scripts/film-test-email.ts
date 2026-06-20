/**
 * OneRead — OneFilm TEST email sender (SAFE, isolated).
 *
 * Builds OneFilm notes from MANUAL film metadata and renders/sends them as
 * clearly-marked TEST emails. This is deliberately isolated from the production
 * pipeline:
 *   - Recipient is HARD-LOCKED to a single test address. Any other recipient is
 *     refused.
 *   - It NEVER writes to the database (no FilmDailyIssue / FilmDailySend rows).
 *   - It NEVER touches production subscribers or marks real sends.
 *   - Subject is always prefixed "[TEST]".
 *   - No invented metadata: factual fields come only from the manual film input;
 *     ratings/awards/streaming availability are never added. The NO_FILM case
 *     reports and never sends.
 *
 * Usage:
 *   npm run film:test-email             # dry preview only (no email sent)
 *   npm run film:test-email -- --send   # actually send the [TEST] emails
 *
 * Generation uses the deterministic grounded fallback when GEMINI_API_KEY is not
 * present locally, so the email still renders the film-note format.
 */

import type { FilmCatalogEntry } from "@prisma/client";
import { generateFilmIssue } from "../lib/film/generator";
import { renderFilmEmail } from "../lib/film/email-template";
import { runFilmGates } from "../lib/film/quality";
import { toSpoilerLevel } from "../lib/film/prompts";
import type { FilmSegment } from "../lib/film/segments";
import { sendDailyEmail } from "../lib/resend";
import { geminiConfigured } from "../lib/ai";

/** HARD-LOCKED test recipient. Sending to anyone else is refused. */
const TEST_RECIPIENT = "tterekli9@gmail.com";

function seg(spoilerPreference: string): FilmSegment {
  return { emailLanguage: "Turkish", genres: ["Drama"], moods: ["Quiet"], spoilerPreference };
}

function film(partial: Partial<FilmCatalogEntry>): FilmCatalogEntry {
  const now = new Date();
  return {
    id: partial.id ?? "film-test",
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
    createdBy: "film:test-email",
    createdAt: now,
    updatedAt: now,
    ...partial,
  } as FilmCatalogEntry;
}

/** Scenario 1 — complete grounded metadata. */
const COMPLETE = film({
  id: "complete",
  title: "Drive My Car",
  year: 2021,
  director: "Ryusuke Hamaguchi",
  filmLanguage: "Japanese",
  runtimeMinutes: 179,
  genres: ["Drama"],
  moods: ["Quiet", "Reflective"],
  adminNote: "Yas ve dinlemek üzerine sakin, insancıl bir yol filmi.",
});

/** Scenario 2 — partial metadata: title + admin note only (must not invent facts). */
const PARTIAL = film({
  id: "partial",
  title: "İsimsiz Bağımsız Film",
  adminNote: "Bir arkadaşın önerdiği küçük bir festival draması; sakin ve sıcak.",
});

interface Scenario {
  name: string;
  segment: FilmSegment;
  film: FilmCatalogEntry | null;
  expectSend: boolean;
}

async function runScenario(s: Scenario, send: boolean): Promise<boolean> {
  console.log(`\n========== ${s.name} ==========`);

  const spoilerLevel = toSpoilerLevel(s.segment.spoilerPreference);
  const issue = await generateFilmIssue(s.segment, s.film, {
    spoilerPreference: s.segment.spoilerPreference,
    allowDeterministic: !send,
  });

  if (!issue.generated) {
    console.log(`  generated=false reason=${issue.reason} provider=${issue.provider}`);
    if (!s.expectSend) console.log("  PASS: correctly did not generate (no send).");
    else console.error("  FAIL: expected a sendable note.");
    return !s.expectSend;
  }
  if (!s.expectSend) {
    console.error("  FAIL: expected NO_FILM (no send) but a note was generated.");
    return false;
  }
  if (send && issue.provider !== "gemini") {
    console.error(`  FAIL: live send requires real Gemini output; got provider=${issue.provider}.`);
    return false;
  }

  // Grounding guard: stored metadata must not contain facts the input lacked.
  const gm = issue.content.metadata ?? {};
  const f = s.film!;
  const invented =
    (f.year == null && gm.year != null) ||
    (!f.director && gm.director != null) ||
    (f.runtimeMinutes == null && gm.runtimeMinutes != null) ||
    (!f.filmLanguage && gm.language != null);
  if (invented) {
    console.error("  FAIL: stored metadata invented a fact not in the input — refusing to send.");
    return false;
  }

  const gate = runFilmGates(issue.content, f, spoilerLevel, { subject: issue.subject, previewText: issue.previewText });
  if (!gate.ok) {
    console.error(`  FAIL: quality gate failed — ${gate.warnings.join(" | ")}`);
    return false;
  }

  const rendered = renderFilmEmail(
    { subject: issue.subject, previewText: issue.previewText, contentJson: issue.content as never },
    { date: new Date().toISOString().slice(0, 10), emailLanguage: s.segment.emailLanguage, links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" } },
  );

  const subject = `[TEST] ${rendered.subject}`;
  console.log(`  provider=${issue.provider} model=${issue.model ?? "—"} · spoiler=${spoilerLevel} · validation=${gate.ok ? "VALID" : "FAILED"}`);
  console.log(`  film=${issue.content.filmTitle} · metadata=${JSON.stringify(gm)}`);
  console.log(`  subject: ${subject}`);

  if (!send) {
    console.log("  DRY PREVIEW (no email sent). Pass -- --send to deliver.");
    return true;
  }

  const result = await sendDailyEmail({ to: TEST_RECIPIENT, subject, text: rendered.text, html: rendered.html });
  if (result.messageId) {
    console.log(`  SENT to ${TEST_RECIPIENT} · messageId=${result.messageId}`);
    return true;
  } else {
    console.log(`  NOT DELIVERED: Resend returned no message id (RESEND_API_KEY missing/empty locally). The email was rendered and the send was attempted to ${TEST_RECIPIENT}; run this where RESEND_API_KEY is set to deliver.`);
    return false;
  }
}

async function main() {
  const send = process.argv.includes("--send");

  // Recipient guard — refuse any override that is not the locked test address.
  const recipientOverride = process.argv.find((a) => a.startsWith("--to="));
  if (recipientOverride && recipientOverride.slice("--to=".length) !== TEST_RECIPIENT) {
    throw new Error(`Refusing to send: recipient is hard-locked to ${TEST_RECIPIENT}.`);
  }

  console.log(`[film:test-email] recipient=${TEST_RECIPIENT} · mode=${send ? "SEND" : "DRY PREVIEW"} · gemini=${geminiConfigured() ? "configured" : "missing (deterministic fallback)"}`);
  console.log("[film:test-email] never writes DB · never touches production subscribers");

  const scenarios: Scenario[] = [
    { name: "1) Complete metadata", segment: seg("Spoiler-light"), film: COMPLETE, expectSend: true },
    { name: "2) Partial metadata (title + admin note only)", segment: seg("Spoiler-light"), film: PARTIAL, expectSend: true },
    { name: "3) Spoiler-free mode", segment: seg("Spoiler-free"), film: COMPLETE, expectSend: true },
    { name: "4) NO_FILM case (must NOT send)", segment: seg("Spoiler-light"), film: null, expectSend: false },
  ];

  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? Number(onlyArg.slice("--only=".length)) : null;
  const selected = only && only >= 1 && only <= scenarios.length ? [scenarios[only - 1]] : scenarios;

  let ok = true;
  for (const s of selected) {
    const scenarioOk = await runScenario(s, send);
    ok = ok && scenarioOk;
  }
  console.log("\n[film:test-email] done.");
  if (!ok) process.exitCode = 1;
}

main().catch((err) => {
  console.error("[film:test-email] error:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
