#!/usr/bin/env node
/**
 * The Phase 1 money-flow regression gate.
 *
 * Phase 1's billing work landed as a series of tasks, each with its own tests.
 * This is the single command that runs all of them as one contract, in the
 * order the layers depend on each other:
 *
 *   1. unit        offer mapping and the billing/entitlement policies
 *   2. matrix      every mandatory case still has an owning test
 *   3. integration verification/checkout boundary, signed webhook, DB transitions
 *   4. e2e         product selection -> email -> verification -> checkout boundary
 *
 * The fifth layer — a controlled provider smoke against real Polar — cannot be
 * automated here and is not pretended to be. It is a runbook step, and this
 * command ends by saying so rather than reporting a green gate that never
 * touched a payment provider. See docs/MONEY_FLOW_REGRESSION_GATE.md.
 *
 * Usage:
 *   PRISMA_DATABASE_URL=<throwaway db> npm run gate:money-flow
 *   ... --skip-e2e     unit + matrix + integration only (no browser, no build)
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const skipE2e = process.argv.includes("--skip-e2e");

/* ---------------------------- database safety ---------------------------- */

/**
 * The integration layer writes. It must never write to production.
 *
 * Two independent guards, because either alone has a hole: the URL must not be
 * the one `.env` holds (that file carries the production credentials), and the
 * host must be local. `MONEY_FLOW_GATE_ALLOW_REMOTE_DB=true` opens the second
 * one for a hosted throwaway database; nothing opens the first.
 */
function productionUrlFromEnvFile() {
  try {
    const contents = readFileSync(".env", "utf8");
    const match = contents.match(/^\s*PRISMA_DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function assertSafeDatabase() {
  const url = process.env.PRISMA_DATABASE_URL;
  if (!url) {
    fail(
      "PRISMA_DATABASE_URL is not set.\n" +
        "The integration layer writes rows, so this gate refuses to guess at a database.\n" +
        "Point it at a throwaway one, e.g.\n" +
        "  PRISMA_DATABASE_URL=postgresql://$(whoami)@localhost:5432/oneread_gate npm run gate:money-flow",
    );
  }

  const production = productionUrlFromEnvFile();
  if (production && url.trim() === production) {
    fail("PRISMA_DATABASE_URL matches the value in .env. That is the production database.");
  }

  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    fail("PRISMA_DATABASE_URL is not a URL this gate can check. Refusing to run.");
  }
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && process.env.MONEY_FLOW_GATE_ALLOW_REMOTE_DB !== "true") {
    fail(
      `PRISMA_DATABASE_URL points at "${host}", which is not local.\n` +
        "Set MONEY_FLOW_GATE_ALLOW_REMOTE_DB=true only if that host is a throwaway database.",
    );
  }
  return { host, local };
}

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/* -------------------------------- layers --------------------------------- */

const layers = [
  {
    name: "unit + matrix",
    proves: "offer mapping, billing/entitlement policy, and that every matrix case still has an owner",
    command: ["npx", ["vitest", "run"]],
  },
  {
    name: "integration",
    proves: "verification/checkout boundary, signed webhook, and DB transitions",
    command: ["npx", ["vitest", "run", "--config", "vitest.integration.config.ts"]],
  },
  ...(skipE2e
    ? []
    : [
        {
          name: "e2e",
          proves: "product selection -> email -> verification -> checkout boundary in a browser",
          command: ["npm", ["run", "test:e2e"]],
        },
      ]),
];

const safety = assertSafeDatabase();
console.log(`Money-flow gate — database host: ${safety.host}${safety.local ? " (local)" : ""}\n`);

const results = [];
for (const layer of layers) {
  console.log(`\n──── ${layer.name}: ${layer.proves}\n`);
  const [command, args] = layer.command;
  const started = Date.now();
  const run = spawnSync(command, args, { stdio: "inherit", env: process.env });
  const ok = run.status === 0;
  results.push({ name: layer.name, ok, seconds: Math.round((Date.now() - started) / 100) / 10 });
  if (!ok) break;
}

console.log("\n──── result\n");
for (const result of results) {
  console.log(`  ${result.ok ? "PASS" : "FAIL"}  ${result.name} (${result.seconds}s)`);
}
if (skipE2e) console.log("  SKIP  e2e (--skip-e2e)");

const failed = results.find((result) => !result.ok);
if (failed) {
  console.error(`\n✗ Money-flow gate FAILED at the ${failed.name} layer.\n`);
  process.exit(1);
}

console.log(
  "\n✓ Automated layers pass." +
    (skipE2e ? " (e2e was skipped, so this is not the full gate.)" : "") +
    "\n\nStill required before calling Phase 1 done: the controlled provider smoke\n" +
    "against real Polar — a real payment and a real signed lifecycle event, verified\n" +
    "with `npm run smoke:critical-path`. See docs/MONEY_FLOW_REGRESSION_GATE.md.\n",
);
