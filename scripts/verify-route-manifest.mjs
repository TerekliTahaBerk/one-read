#!/usr/bin/env node
/**
 * Fails the build when a dev/test-only route made it into the production
 * artifact.
 *
 * The route policy is enforced at build time by `pageExtensions` in
 * next.config.mjs. This script is the independent check on the *output* of that
 * build: it reads the manifest Next.js actually emitted and asserts the
 * forbidden routes are absent. A refactor that renames a file back, a stray
 * `pageExtensions` edit, or a merge that resurrects a route all show up here
 * rather than in production.
 *
 * Usage:  node scripts/verify-route-manifest.mjs [--dir .next]
 * Exit:   0 clean, 1 violation or unreadable manifest.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  FORBIDDEN_PRODUCTION_ROUTES,
  findForbiddenRoutes,
} from "../lib/security/route-policy.mjs";

const args = process.argv.slice(2);
const dirFlag = args.indexOf("--dir");
const buildDir = dirFlag !== -1 && args[dirFlag + 1] ? args[dirFlag + 1] : ".next";
const manifestPath = path.resolve(process.cwd(), buildDir, "app-path-routes-manifest.json");

/** Appends to the GitHub Actions job summary when running in CI. */
async function summarize(markdown) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  const { appendFile } = await import("node:fs/promises");
  await appendFile(target, `${markdown}\n`);
}

async function main() {
  let raw;
  try {
    raw = await readFile(manifestPath, "utf8");
  } catch (error) {
    // A missing manifest means the build did not produce what we are meant to
    // audit. Treat that as a failure, never as "nothing forbidden found".
    console.error(`✗ Could not read the route manifest at ${manifestPath}`);
    console.error(`  ${error.message}`);
    console.error("  Run `npm run build` first.");
    await summarize("### ✗ Route manifest guard\n\nThe build produced no route manifest to audit.");
    process.exit(1);
  }

  /** @type {Record<string, string>} manifest maps app file path → route path. */
  const manifest = JSON.parse(raw);
  const routes = Object.values(manifest);
  const violations = findForbiddenRoutes(routes);

  if (violations.length > 0) {
    console.error("✗ Forbidden routes are present in the production build:\n");
    const lines = [];
    for (const { route, reason } of violations) {
      console.error(`  ${route}`);
      console.error(`    ${reason}\n`);
      lines.push(`- \`${route}\` — ${reason}`);
    }
    console.error(
      "These routes must not ship. They are excluded via `pageExtensions` in\n" +
        "next.config.mjs; check that their files still use the `.mock.ts[x]`\n" +
        "naming and that the policy in lib/security/route-policy.mjs is intact.",
    );
    await summarize(
      `### ✗ Route manifest guard\n\nForbidden routes found in the production build:\n\n${lines.join("\n")}`,
    );
    process.exit(1);
  }

  console.log(
    `✓ Route manifest clean — ${routes.length} routes checked against ` +
      `${FORBIDDEN_PRODUCTION_ROUTES.length} forbidden-route rules.`,
  );
  await summarize(
    `### ✓ Route manifest guard\n\n${routes.length} production routes checked; ` +
      `no dev/test-only routes present.`,
  );
}

await main();
