/**
 * OneRead — production release provenance rules.
 *
 * Pure decision logic shared by the three release guards:
 *
 *   1. `scripts/verify-build-provenance.mjs` — runs *inside* the Vercel build,
 *      so it is the only guard a stray `vercel --prod` cannot walk around.
 *   2. `scripts/deploy-production.mjs`       — the sanctioned emergency CLI path.
 *   3. `scripts/verify-release-provenance.mjs` — after-the-fact audit, run by CI
 *      and on a schedule.
 *
 * There is no I/O here on purpose: every rule is a function of data the callers
 * collect, which is what makes the rules testable in `provenance.test.mjs`.
 *
 * Background — why these rules exist at all:
 * production history contained deployments of the *same* Git SHA created twice,
 * once by the Vercel Git integration and once from a developer machine, and two
 * of the CLI ones carried `gitDirty=1`. A dirty deployment is an artifact that
 * cannot be rebuilt from any commit, which quietly breaks rollback, migration
 * ordering and incident forensics all at once.
 */

/** The only branch allowed to reach the production target. */
export const PRODUCTION_BRANCH = "main";

/** Hostnames that mean "real users are being served this deployment". */
export const PRODUCTION_HOSTS = ["oneread.email", "www.oneread.email"];

export const REPO_OWNER = "TerekliTahaBerk";
export const REPO_NAME = "one-read";

/**
 * Deployment meta key set by `scripts/deploy-production.mjs`. Its presence is
 * what separates a deliberate emergency deploy from someone typing
 * `vercel --prod` out of habit — both are `source=cli` to Vercel.
 */
export const EMERGENCY_CHANNEL = "emergency";

/**
 * When these rules started being enforced.
 *
 * Production history before this point contains known violations — duplicate
 * deployments of the same SHA and two `gitDirty=1` artifacts — and they cannot
 * be retroactively fixed. The audit reports them so the record stays honest,
 * but only deployments created from this moment on can fail a check.
 */
export const ENFORCED_FROM = Date.parse("2026-08-07T00:00:00Z");

const FULL_SHA = /^[0-9a-f]{40}$/;

/** Shortest emergency reason we accept; "fix" and "asdf" are not a record. */
const MIN_REASON_LENGTH = 12;

export function isFullSha(value) {
  return typeof value === "string" && FULL_SHA.test(value);
}

export function shortSha(value) {
  return isFullSha(value) ? value.slice(0, 8) : String(value ?? "-");
}

function violation(code, message) {
  return { code, message };
}

/**
 * Tells a Git-integration deployment apart from a CLI deployment.
 *
 * This is *not* obvious from `meta`: when the CLI runs inside a linked repo it
 * copies `githubCommitSha`, `githubCommitRef` and even `githubDeployment: "1"`
 * from the local checkout, so none of those discriminate. Only the Vercel Git
 * integration sets `branchAlias` (the `*-git-<branch>-*.vercel.app` hostname)
 * and `repoPushedAt` (the push timestamp GitHub reported), because both are
 * facts about the *remote* that a local CLI has no way to invent.
 *
 * Verified against the full production deployment history of this project:
 * every deployment carrying `branchAlias` + `repoPushedAt` had a matching
 * GitHub Deployment record, and every deployment without them had none.
 */
export function classifyDeploymentSource(meta) {
  const m = meta ?? {};
  return m.branchAlias && m.repoPushedAt ? "git" : "cli";
}

/**
 * Flattens one entry of `vercel list --format json` into the fields the rules
 * care about, so callers never reach into raw `meta` themselves.
 */
export function describeDeployment(deployment) {
  const meta = deployment?.meta ?? {};
  return {
    id: deployment?.uid ?? deployment?.id ?? null,
    url: deployment?.url ?? null,
    createdAt: deployment?.createdAt ?? null,
    state: deployment?.state ?? deployment?.readyState ?? null,
    target: deployment?.target ?? null,
    sha: meta.githubCommitSha ?? null,
    ref: meta.githubCommitRef ?? null,
    dirty: meta.gitDirty === "1",
    source: classifyDeploymentSource(meta),
    releaseChannel: meta.releaseChannel ?? null,
    releaseReason: meta.releaseReason ?? null,
  };
}

/**
 * Rules a *production* deployment must satisfy to count as reproducible.
 *
 * `shaOnMain` is tri-state: `true`/`false` are answers from GitHub, `undefined`
 * means the caller did not ask (the build-time guard checks it separately).
 */
export function checkProductionDeployment(summary, options = {}) {
  const violations = [];

  if (summary.dirty) {
    violations.push(
      violation(
        "dirty_working_tree",
        `Deployed from an uncommitted working tree (gitDirty=1); the artifact cannot be rebuilt from ${shortSha(summary.sha)}.`,
      ),
    );
  }

  if (!isFullSha(summary.sha)) {
    violations.push(
      violation(
        "missing_commit_sha",
        "No Git commit SHA in the deployment metadata; there is nothing to trace the artifact back to.",
      ),
    );
  }

  if (summary.ref !== PRODUCTION_BRANCH) {
    violations.push(
      violation(
        "wrong_branch",
        `Production deployment built from ref "${summary.ref ?? "(none)"}" instead of "${PRODUCTION_BRANCH}".`,
      ),
    );
  }

  if (summary.source === "cli" && summary.releaseChannel !== EMERGENCY_CHANNEL) {
    violations.push(
      violation(
        "unsanctioned_cli_deployment",
        "Created by the Vercel CLI outside the emergency flow; normal production releases must come from the Git integration.",
      ),
    );
  }

  if (options.shaOnMain === false) {
    violations.push(
      violation(
        "commit_not_on_main",
        `Commit ${shortSha(summary.sha)} is not reachable from origin/${PRODUCTION_BRANCH} on GitHub.`,
      ),
    );
  }

  return violations;
}

/**
 * Groups production deployments by commit so a SHA deployed twice is visible.
 *
 * One merged commit must produce exactly one production deployment; a second
 * one means two artifacts claim to be the same source, and nothing downstream
 * (migrations, incident timelines, rollbacks) can tell them apart.
 */
export function findDuplicateProductionShas(summaries) {
  const bySha = new Map();

  for (const summary of summaries) {
    if (!isFullSha(summary.sha)) continue;
    const existing = bySha.get(summary.sha);
    if (existing) existing.push(summary);
    else bySha.set(summary.sha, [summary]);
  }

  return [...bySha.entries()]
    .filter(([, deployments]) => deployments.length > 1)
    .map(([sha, deployments]) => ({ sha, deployments }))
    .sort((a, b) => {
      const aAt = a.deployments[0]?.createdAt ?? 0;
      const bAt = b.deployments[0]?.createdAt ?? 0;
      return bAt - aAt;
    });
}

/**
 * Splits deployments into the ones these rules govern and the pre-existing
 * history they only describe.
 */
export function partitionByEnforcement(summaries, enforcedFrom = ENFORCED_FROM) {
  const enforced = [];
  const historical = [];

  for (const summary of summaries) {
    const createdAt = Number(summary.createdAt ?? 0);
    if (createdAt >= enforcedFrom) enforced.push(summary);
    else historical.push(summary);
  }

  return { enforced, historical };
}

export function isProductionAliasHost(alias) {
  const host = String(alias ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  return PRODUCTION_HOSTS.includes(host);
}

/**
 * Gate for the sanctioned CLI path, evaluated *before* anything is uploaded.
 *
 * `headIsOnRemoteMain` rather than `branch === "main"` on purpose: a rollback
 * redeploy legitimately sits on an older commit, possibly on a detached HEAD.
 * What matters is that the commit is published and reachable from main, not
 * which local branch name happens to point at it.
 */
export function evaluateDeployPreflight(input) {
  const {
    headSha,
    dirtyPaths = [],
    headIsOnRemoteMain,
    remoteMainSha = null,
    productionShas = [],
    reason = "",
  } = input ?? {};

  const violations = [];

  if (dirtyPaths.length > 0) {
    const preview = dirtyPaths.slice(0, 5).join(", ");
    const rest = dirtyPaths.length > 5 ? `, +${dirtyPaths.length - 5} more` : "";
    violations.push(
      violation(
        "dirty_working_tree",
        `Working tree is not clean (${preview}${rest}). Commit or stash before deploying.`,
      ),
    );
  }

  if (!isFullSha(headSha)) {
    violations.push(
      violation("missing_commit_sha", "Could not resolve HEAD to a full commit SHA."),
    );
  }

  if (headIsOnRemoteMain === false) {
    violations.push(
      violation(
        "head_not_on_main",
        `HEAD (${shortSha(headSha)}) is not reachable from origin/${PRODUCTION_BRANCH}. Push and merge it first.`,
      ),
    );
  }

  if (isFullSha(headSha) && productionShas.includes(headSha)) {
    violations.push(
      violation(
        "duplicate_production_sha",
        `${shortSha(headSha)} already has a production deployment. Re-promote that deployment instead of building a second artifact for the same commit.`,
      ),
    );
  }

  if (reason.trim().length < MIN_REASON_LENGTH) {
    violations.push(
      violation(
        "missing_emergency_reason",
        `--reason is required and must be at least ${MIN_REASON_LENGTH} characters; it is recorded in the deployment metadata.`,
      ),
    );
  }

  const notes = [];
  if (isFullSha(headSha) && isFullSha(remoteMainSha) && headSha !== remoteMainSha) {
    notes.push(
      `HEAD is behind origin/${PRODUCTION_BRANCH} (${shortSha(remoteMainSha)}); this deploy will roll production back to ${shortSha(headSha)}.`,
    );
  }

  return { violations, notes };
}

/**
 * Checks the Vercel build environment. Only documented `VERCEL_*` system
 * variables are read, because this runs on Vercel's builders where we cannot
 * inspect anything else.
 */
export function evaluateBuildEnvironment(env = {}) {
  const target = env.VERCEL_TARGET_ENV || env.VERCEL_ENV || null;
  const sha = env.VERCEL_GIT_COMMIT_SHA || null;
  const ref = env.VERCEL_GIT_COMMIT_REF || null;
  const owner = env.VERCEL_GIT_REPO_OWNER || null;
  const repo = env.VERCEL_GIT_REPO_SLUG || null;

  const violations = [];

  if (!isFullSha(sha)) {
    violations.push(
      violation(
        "missing_commit_sha",
        "VERCEL_GIT_COMMIT_SHA is missing or malformed; this production build has no traceable source commit.",
      ),
    );
  }

  if (ref !== PRODUCTION_BRANCH) {
    violations.push(
      violation(
        "wrong_branch",
        `VERCEL_GIT_COMMIT_REF is "${ref ?? "(none)"}"; production may only be built from "${PRODUCTION_BRANCH}".`,
      ),
    );
  }

  if (owner && owner.toLowerCase() !== REPO_OWNER.toLowerCase()) {
    violations.push(
      violation("wrong_repository", `Unexpected repository owner "${owner}".`),
    );
  }

  if (repo && repo.toLowerCase() !== REPO_NAME.toLowerCase()) {
    violations.push(
      violation("wrong_repository", `Unexpected repository "${repo}".`),
    );
  }

  return { target, sha, ref, owner, repo, violations };
}

/** True when the build guard should enforce anything at all. */
export function isProductionBuild(env = {}) {
  const target = env.VERCEL_TARGET_ENV || env.VERCEL_ENV || null;
  return Boolean(env.VERCEL) && target === "production";
}

export function formatViolations(violations) {
  return violations.map((v) => `  ✗ [${v.code}] ${v.message}`).join("\n");
}
