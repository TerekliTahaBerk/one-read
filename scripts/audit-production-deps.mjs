#!/usr/bin/env node
/**
 * Production dependency audit gate.
 *
 * Wraps `npm audit --omit=dev` so a high or critical finding fails the build
 * *visibly*: the advisory titles, the affected packages, and the dependency
 * path land in the GitHub Actions job summary instead of only in a folded log.
 *
 * Dev-only advisories are reported for awareness but never fail the gate —
 * they are not part of the shipped artifact.
 *
 * Usage:  node scripts/audit-production-deps.mjs [--level high]
 * Exit:   0 clean, 1 at/above the failing severity, 2 audit could not run.
 */

import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";
import process from "node:process";

const SEVERITY_ORDER = ["info", "low", "moderate", "high", "critical"];

const args = process.argv.slice(2);
const levelFlag = args.indexOf("--level");
const failLevel = levelFlag !== -1 && args[levelFlag + 1] ? args[levelFlag + 1] : "high";
const failFrom = SEVERITY_ORDER.indexOf(failLevel);

if (failFrom === -1) {
  console.error(`Unknown severity "${failLevel}". Expected one of: ${SEVERITY_ORDER.join(", ")}`);
  process.exit(2);
}

/** Runs npm audit and returns its stdout, ignoring the non-zero exit it uses to signal findings. */
function runAudit() {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["audit", "--omit=dev", "--json"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", () => {
      if (!stdout.trim()) {
        reject(new Error(stderr.trim() || "npm audit produced no output"));
        return;
      }
      resolve(stdout);
    });
  });
}

async function summarize(markdown) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;
  await appendFile(target, `${markdown}\n`);
}

let report;
try {
  report = JSON.parse(await runAudit());
} catch (error) {
  // Never treat "the audit did not run" as "the audit passed".
  console.error(`✗ Could not run npm audit: ${error.message}`);
  await summarize("### ✗ Production dependency audit\n\nThe audit could not be run.");
  process.exit(2);
}

const counts = report.metadata?.vulnerabilities ?? {};
const blocking = Object.entries(report.vulnerabilities ?? {}).filter(
  ([, vuln]) => SEVERITY_ORDER.indexOf(vuln.severity) >= failFrom,
);

const tally = SEVERITY_ORDER.map((severity) => `${counts[severity] ?? 0} ${severity}`).join(", ");
const scanned = report.metadata?.dependencies?.prod ?? "?";

if (blocking.length === 0) {
  console.log(`✓ Production dependency audit clean — ${scanned} production packages (${tally}).`);
  await summarize(
    `### ✓ Production dependency audit\n\n` +
      `${scanned} production dependencies scanned. No \`${failLevel}\` or higher advisories.\n\n` +
      `Findings by severity: ${tally}.`,
  );
  process.exit(0);
}

console.error(`✗ ${blocking.length} production dependencies at or above "${failLevel}":\n`);

const rows = ["| Package | Severity | Advisory | Reached via |", "| --- | --- | --- | --- |"];
for (const [name, vuln] of blocking) {
  // `via` mixes advisory objects with plain package-name strings; the objects
  // are the advisories themselves, the strings are intermediate packages.
  const advisories = (vuln.via ?? []).filter((entry) => typeof entry === "object");
  const title = advisories.map((a) => a.title).join("; ") || "transitively vulnerable";
  const url = advisories.find((a) => a.url)?.url;
  const reachedVia = (vuln.effects ?? []).join(", ") || "direct dependency";

  console.error(`  ${name}@${vuln.range}  [${vuln.severity}]`);
  console.error(`    ${title}`);
  if (url) console.error(`    ${url}`);
  console.error(`    reached via: ${reachedVia}\n`);

  rows.push(
    `| \`${name}\` | ${vuln.severity} | ${url ? `[${title}](${url})` : title} | ${reachedVia} |`,
  );
}

console.error(
  "Fix by upgrading the dependency, or by pinning a patched version in the\n" +
    '"overrides" block of package.json when the fix is only available upstream.',
);

await summarize(
  `### ✗ Production dependency audit\n\n` +
    `${blocking.length} advisory group(s) at \`${failLevel}\` or higher in the shipped ` +
    `dependency tree.\n\n${rows.join("\n")}\n\n` +
    `Findings by severity: ${tally}.`,
);

process.exit(1);
