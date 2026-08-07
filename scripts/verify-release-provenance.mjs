#!/usr/bin/env node
/**
 * OneRead — production release provenance audit.
 *
 * Answers the question the build guard cannot: *what is the production domain
 * actually serving right now, and where did it come from?* The build guard runs
 * before an artifact exists; this runs after one has been promoted.
 *
 *   npm run release:verify
 *   npm run release:verify -- --deployment https://one-read-xxxx.vercel.app
 *   npm run release:verify -- --json
 *
 * Checks:
 *   • the deployment behind oneread.email was created by the Git integration
 *     (or carries an explicit emergency stamp), from a clean tree, on `main`;
 *   • its commit is published on GitHub and reachable from `main`;
 *   • no commit in the recent window has more than one production deployment.
 *
 * Deployments predating `ENFORCED_FROM` are reported but never fail the run —
 * see the note on that constant.
 *
 * Needs a Vercel session: `vercel login` locally, or `VERCEL_TOKEN` in CI.
 */

import { appendFileSync } from "node:fs";

import {
  commitIsOnMain,
  inspectDeployment,
  listProductionDeployments,
} from "./release/io.mjs";
import {
  checkProductionDeployment,
  describeDeployment,
  findDuplicateProductionShas,
  formatViolations,
  isFullSha,
  isProductionAliasHost,
  partitionByEnforcement,
  PRODUCTION_HOSTS,
  shortSha,
} from "./release/provenance.mjs";

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function parseArgs(argv) {
  const args = { json: false, deployment: null, pages: 3 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--deployment") args.deployment = argv[++i] ?? null;
    else if (arg.startsWith("--deployment=")) args.deployment = arg.slice("--deployment=".length);
    else if (arg === "--pages") args.pages = Number(argv[++i]) || 3;
  }

  return args;
}

/** Deployments are listed with `meta`, but inspected without it — match by URL. */
function findSummary(summaries, target) {
  const needle = String(target ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  return summaries.find(
    (summary) => summary.url?.toLowerCase() === needle || summary.id === target,
  );
}

async function auditDeployment(label, summary) {
  const issues = [];

  let shaOnMain;
  if (isFullSha(summary.sha)) {
    try {
      ({ onMain: shaOnMain } = await commitIsOnMain(summary.sha));
    } catch (error) {
      issues.push({
        code: "provenance_unverifiable",
        message: `Could not confirm ${shortSha(summary.sha)} against GitHub: ${error.message}`,
      });
    }
  }

  issues.push(...checkProductionDeployment(summary, { shaOnMain }));
  return { label, summary, issues };
}

function renderDeployment(audit) {
  const { label, summary, issues } = audit;
  const mark = issues.length === 0 ? "✓" : "✗";

  log(`${mark} ${label}`);
  log(`    url     https://${summary.url}`);
  log(`    commit  ${shortSha(summary.sha)} on ${summary.ref ?? "(no ref)"}`);
  log(`    source  ${summary.source}${summary.releaseChannel ? ` (${summary.releaseChannel})` : ""}`);
  log(`    dirty   ${summary.dirty ? "YES" : "no"}`);
  if (summary.releaseReason) log(`    reason  ${summary.releaseReason}`);
  if (issues.length > 0) log(formatViolations(issues));
}

function writeStepSummary(lines) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) return;
  try {
    appendFileSync(path, `${lines.join("\n")}\n`);
  } catch {
    // A missing summary file must never fail the audit itself.
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const summaries = listProductionDeployments({ pages: args.pages }).map(describeDeployment);
  if (summaries.length === 0) {
    log("No production deployments found — is the Vercel session or VERCEL_TOKEN valid?");
    return 1;
  }

  const audits = [];

  // 1. Whatever the production domain resolves to right now.
  const liveHost = PRODUCTION_HOSTS[0];
  const live = inspectDeployment(`https://${liveHost}`);
  const liveSummary = findSummary(summaries, live.url);

  if (!liveSummary) {
    log(`✗ ${liveHost} resolves to ${live.url}, which is outside the audited window.`);
    log("  Re-run with --pages to widen it.");
    return 1;
  }

  if (!(live.aliases ?? []).some(isProductionAliasHost)) {
    log(`✗ ${live.url} no longer carries a production alias; the lookup raced a promotion.`);
    return 1;
  }

  audits.push(await auditDeployment(`live on ${PRODUCTION_HOSTS.join(" / ")}`, liveSummary));

  // 2. An explicitly named deployment (CI passes the one that just finished).
  if (args.deployment) {
    const named = findSummary(summaries, args.deployment);
    if (!named) {
      log(`✗ ${args.deployment} is not a production deployment in the audited window.`);
      return 1;
    }
    if (named.url !== liveSummary.url) {
      audits.push(await auditDeployment(`requested ${named.url}`, named));
    }
  }

  // 3. One commit, one production deployment.
  const { enforced, historical } = partitionByEnforcement(summaries);
  const enforcedDuplicates = findDuplicateProductionShas(enforced);
  const historicalDuplicates = findDuplicateProductionShas(historical);
  const historicalDirty = historical.filter((summary) => summary.dirty);

  log(`Audited ${summaries.length} production deployments (${enforced.length} under enforcement).`);
  log("");
  for (const audit of audits) {
    renderDeployment(audit);
    log("");
  }

  if (enforcedDuplicates.length > 0) {
    log("✗ Commits with more than one production deployment:");
    for (const group of enforcedDuplicates) {
      log(`    ${shortSha(group.sha)} → ${group.deployments.map((d) => d.url).join(", ")}`);
    }
    log("");
  } else {
    log("✓ Every enforced commit has exactly one production deployment.");
    log("");
  }

  if (historicalDuplicates.length > 0 || historicalDirty.length > 0) {
    log(
      `ℹ Pre-enforcement history: ${historicalDuplicates.length} duplicated commit(s), ${historicalDirty.length} dirty deployment(s). Reported, not enforced.`,
    );
    log("");
  }

  const failures = audits.filter((audit) => audit.issues.length > 0);
  const ok = failures.length === 0 && enforcedDuplicates.length === 0;

  if (args.json) {
    log(
      JSON.stringify(
        {
          ok,
          audits: audits.map((audit) => ({ ...audit.summary, issues: audit.issues })),
          duplicates: enforcedDuplicates.map((group) => ({
            sha: group.sha,
            urls: group.deployments.map((d) => d.url),
          })),
          historical: {
            duplicates: historicalDuplicates.length,
            dirty: historicalDirty.length,
          },
        },
        null,
        2,
      ),
    );
  }

  writeStepSummary([
    `### Release provenance — ${ok ? "✅ clean" : "❌ violations"}`,
    "",
    `- Live: \`${liveSummary.url}\``,
    `- Commit: \`${shortSha(liveSummary.sha)}\` on \`${liveSummary.ref ?? "-"}\``,
    `- Source: \`${liveSummary.source}\`, dirty: \`${liveSummary.dirty ? "yes" : "no"}\``,
    `- Duplicate production commits under enforcement: ${enforcedDuplicates.length}`,
    ...failures.flatMap((audit) => [
      "",
      `**${audit.label}**`,
      ...audit.issues.map((issue) => `- \`${issue.code}\` ${issue.message}`),
    ]),
  ]);

  return ok ? 0 : 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    log(`Release provenance audit failed: ${error?.stack ?? error}`);
    process.exit(1);
  });
