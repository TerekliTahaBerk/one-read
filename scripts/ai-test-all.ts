/**
 * OneRead — run all AI brain tests (no emails, no DB writes).
 *
 * Runs ai:test:article, ai:test:lingo, ai:test:film in sequence.
 * Each child skips live Gemini calls gracefully when GEMINI_API_KEY is absent.
 * Exits non-zero if any child fails.
 *
 * Usage: npm run ai:test:all
 */

import { spawnSync } from "node:child_process";

const SCRIPTS = [
  "scripts/ai-test-article.ts",
  "scripts/ai-test-lingo.ts",
  "scripts/ai-test-film.ts",
];

let failed = 0;
for (const script of SCRIPTS) {
  console.log(`\n############################################`);
  console.log(`# ${script}`);
  console.log(`############################################`);
  const res = spawnSync(
    process.execPath,
    ["--import", "tsx", "--env-file=.env", script],
    { stdio: "inherit", env: process.env },
  );
  if (res.status !== 0) {
    failed++;
    console.error(`[ai:test:all] ${script} exited with code ${res.status}`);
  }
}

if (failed > 0) {
  console.error(`\n[ai:test:all] ${failed} script(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\n[ai:test:all] all AI brain tests completed.");
}
