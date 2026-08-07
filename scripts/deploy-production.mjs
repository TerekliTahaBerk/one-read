#!/usr/bin/env node
/**
 * OneRead — the only sanctioned CLI route to production.
 *
 * Normal releases do not use this script: merging to `main` is the release, and
 * the Vercel Git integration builds it. This exists for the two cases the Git
 * integration cannot serve — rolling production back to an older commit, and
 * rebuilding when the integration itself is down.
 *
 * It refuses to run unless the commit is committed, published and merged, and
 * unless it does not already have a production deployment. It also stamps
 * `releaseChannel=emergency` plus the operator's reason into the deployment
 * metadata, which is what lets `verify-release-provenance.mjs` tell a deliberate
 * emergency deploy apart from someone typing `vercel --prod` out of habit.
 *
 *   npm run deploy:emergency -- --reason "git integration outage, INC-14"
 *
 * Nothing is uploaded until `--yes` is passed; without it the script prints the
 * plan and stops.
 */

import {
  commitIsOnMain,
  currentBranch,
  deployProduction,
  dirtyPaths,
  headSha,
  listProductionDeployments,
} from "./release/io.mjs";
import {
  describeDeployment,
  evaluateDeployPreflight,
  formatViolations,
  PRODUCTION_BRANCH,
  shortSha,
} from "./release/provenance.mjs";

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function parseArgs(argv) {
  const args = { reason: "", confirm: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--reason") args.reason = argv[++i] ?? "";
    else if (arg.startsWith("--reason=")) args.reason = arg.slice("--reason=".length);
    else if (arg === "--yes" || arg === "-y") args.confirm = true;
  }

  return args;
}

async function main() {
  const { reason, confirm } = parseArgs(process.argv.slice(2));

  const sha = headSha();
  const branch = currentBranch();

  log("[emergency-deploy] Collecting release facts…");
  const dirty = dirtyPaths();

  let onMain;
  try {
    ({ onMain } = await commitIsOnMain(sha));
  } catch (error) {
    log(`[emergency-deploy] Could not reach GitHub: ${error.message}`);
    return 1;
  }

  let production;
  try {
    production = listProductionDeployments({ pages: 2 }).map(describeDeployment);
  } catch (error) {
    log(`[emergency-deploy] Could not list production deployments: ${error.message}`);
    return 1;
  }

  const remoteMain = production.find((entry) => entry.ref === PRODUCTION_BRANCH)?.sha ?? null;

  const { violations, notes } = evaluateDeployPreflight({
    headSha: sha,
    dirtyPaths: dirty,
    headIsOnRemoteMain: onMain,
    remoteMainSha: remoteMain,
    productionShas: production
      .filter((entry) => entry.state === "READY")
      .map((entry) => entry.sha),
    reason,
  });

  if (violations.length > 0) {
    log("");
    log("[emergency-deploy] REFUSED");
    log(formatViolations(violations));
    log("");
    log("[emergency-deploy] Normal releases go through main + the Vercel Git integration.");
    return 1;
  }

  log("");
  log("[emergency-deploy] Plan");
  log(`  commit  ${shortSha(sha)} (branch: ${branch ?? "detached"})`);
  log(`  reason  ${reason}`);
  log("  target  production");
  for (const note of notes) log(`  note    ${note}`);
  log("");

  if (!confirm) {
    log("[emergency-deploy] Nothing deployed. Re-run with --yes to proceed.");
    return 0;
  }

  deployProduction({ reason, sha });

  log("");
  log("[emergency-deploy] Deployed. Now confirm what the domain actually serves:");
  log("[emergency-deploy]   npm run release:verify");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    log(`[emergency-deploy] Failed: ${error?.stack ?? error}`);
    process.exit(1);
  });
