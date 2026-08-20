#!/usr/bin/env node
/**
 * OneRead — production build provenance guard.
 *
 * Wired into `vercel.json` as the first half of the build command, which makes
 * it the one guard that cannot be bypassed by *how* a deployment was created:
 * the Git integration, `vercel --prod` from a laptop and a redeploy from the
 * dashboard all run this file. Failing here fails the build, and a failed build
 * is never promoted to the production domain — so the domain keeps serving the
 * last artifact that did pass.
 *
 * It enforces three things about a production build:
 *
 *   1. it declares a full commit SHA on `main` for this repository;
 *   2. that commit is published on GitHub and reachable from `main`;
 *   3. every tracked file matches that commit — i.e. the deploy was not made
 *      from a dirty working tree.
 *
 * Preview builds are untouched.
 *
 * This runs as the first half of the build command, after the install step and
 * before `next build`. That ordering matters in both directions: `next build`
 * can rewrite `tsconfig.json`, so the guard has to run first — and the install step
 * must not rewrite a tracked file either, which is why `vercel.json` installs
 * with `npm ci` (never writes `package-lock.json`) rather than `npm install`.
 *
 * Escape hatch: set `RELEASE_PROVENANCE_GUARD=off` in the Vercel project's
 * environment variables. It is deliberately a project setting rather than a
 * flag, so disabling it is a recorded, deliberate act — and the build log says
 * loudly that it happened.
 */

import { readFileSync } from "node:fs";

import {
  diffTreeAgainstWorkspace,
  makeProvenanceIgnoreMatcher,
} from "./release/git-tree.mjs";
import {
  commitIsOnMain,
  fetchCommitTree,
  githubToken,
} from "./release/io.mjs";
import {
  evaluateBuildEnvironment,
  formatViolations,
  isFullSha,
  isProductionBuild,
  PRODUCTION_BRANCH,
  shortSha,
} from "./release/provenance.mjs";

/** Non-secret build metadata, echoed so every production build log carries it. */
const REPORTED_ENV = [
  "VERCEL_ENV",
  "VERCEL_TARGET_ENV",
  "VERCEL_DEPLOYMENT_ID",
  "VERCEL_URL",
  "VERCEL_GIT_PROVIDER",
  "VERCEL_GIT_REPO_OWNER",
  "VERCEL_GIT_REPO_SLUG",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
  "VERCEL_GIT_PULL_REQUEST_ID",
];

function log(message = "") {
  process.stdout.write(`${message}\n`);
}

function readIgnoreMatcher() {
  try {
    return makeProvenanceIgnoreMatcher(readFileSync(".vercelignore", "utf8").split("\n"));
  } catch {
    return makeProvenanceIgnoreMatcher([]);
  }
}

function readBlob(path) {
  try {
    return readFileSync(path);
  } catch {
    return null;
  }
}

async function main() {
  if (!isProductionBuild(process.env)) {
    log("[release-guard] Not a Vercel production build — provenance checks skipped.");
    return 0;
  }

  if (process.env.RELEASE_PROVENANCE_GUARD === "off") {
    log("[release-guard] ############################################################");
    log("[release-guard] GUARD DISABLED via RELEASE_PROVENANCE_GUARD=off.");
    log("[release-guard] This production artifact is NOT verified against a commit.");
    log("[release-guard] Remove the variable as soon as the incident is over.");
    log("[release-guard] ############################################################");
    return 0;
  }

  log("[release-guard] Verifying production build provenance");
  for (const key of REPORTED_ENV) {
    if (process.env[key]) log(`[release-guard]   ${key}=${process.env[key]}`);
  }

  const { sha, violations } = evaluateBuildEnvironment(process.env);

  if (isFullSha(sha)) {
    try {
      const { onMain, status } = await commitIsOnMain(sha);
      if (!onMain) {
        violations.push({
          code: "commit_not_on_main",
          message:
            status === "unknown"
              ? `GitHub has no commit ${shortSha(sha)}; it was never pushed.`
              : `Commit ${shortSha(sha)} is "${status}" relative to ${PRODUCTION_BRANCH}, not merged into it.`,
        });
      } else {
        log(`[release-guard]   commit ${shortSha(sha)} is on ${PRODUCTION_BRANCH} (${status})`);
      }
    } catch (error) {
      violations.push({
        code: "provenance_unverifiable",
        message: `Could not confirm the commit against GitHub: ${error.message}. Set RELEASE_GITHUB_TOKEN in the Vercel project if this is a rate limit.`,
      });
    }

    try {
      const entries = await fetchCommitTree(sha);
      const diff = diffTreeAgainstWorkspace(entries, readBlob, { ignore: readIgnoreMatcher() });

      if (diff.clean) {
        log(`[release-guard]   ${diff.checked} tracked files match ${shortSha(sha)}`);
      } else {
        const changed = diff.modified.map((entry) => entry.path);
        const details = [...changed, ...diff.missing.map((path) => `${path} (absent)`)];
        const preview = details.slice(0, 10).join(", ");
        const rest = details.length > 10 ? `, +${details.length - 10} more` : "";
        violations.push({
          code: "dirty_working_tree",
          message: `Build sources differ from commit ${shortSha(sha)}: ${preview}${rest}. This artifact cannot be rebuilt from any commit.`,
        });
      }
    } catch (error) {
      violations.push({
        code: "provenance_unverifiable",
        message: `Could not compare the build sources with the commit tree: ${error.message}. Set RELEASE_GITHUB_TOKEN in the Vercel project if this is a rate limit.`,
      });
    }
  }

  if (violations.length === 0) {
    log("[release-guard] Provenance OK — artifact is reproducible from Git.");
    return 0;
  }

  log("");
  log("[release-guard] PRODUCTION BUILD BLOCKED");
  log(formatViolations(violations));
  log("");
  log("[release-guard] Normal releases: merge to main and let the Vercel Git integration deploy.");
  log("[release-guard] Emergency releases: npm run deploy:emergency -- --reason \"...\"");
  log(`[release-guard] GitHub token configured: ${githubToken() ? "yes" : "no"}`);
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    // A crashing guard must not become a silent pass on production.
    log(`[release-guard] Guard crashed: ${error?.stack ?? error}`);
    process.exit(1);
  });
