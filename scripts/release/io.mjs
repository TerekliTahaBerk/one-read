/**
 * OneRead — I/O adapters for the release guards.
 *
 * Everything that talks to git, GitHub or the Vercel CLI lives here so the
 * rules in `provenance.mjs` stay pure and testable. Nothing in this file makes
 * a decision; it only collects facts.
 */

import { execFileSync } from "node:child_process";

import {
  EMERGENCY_CHANNEL,
  PRODUCTION_BRANCH,
  REPO_NAME,
  REPO_OWNER,
} from "./provenance.mjs";

const GITHUB_API = "https://api.github.com";

/* -------------------------------------------------------------------------- */
/* git                                                                        */
/* -------------------------------------------------------------------------- */

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

export function headSha() {
  try {
    return git(["rev-parse", "HEAD"]);
  } catch {
    return null;
  }
}

/**
 * Paths with uncommitted changes, including untracked files.
 *
 * Untracked files count: `vercel --prod` uploads the working directory, so an
 * untracked file that the build imports lands in the artifact exactly like a
 * modified one.
 */
export function dirtyPaths() {
  const output = git(["status", "--porcelain=v1", "--untracked-files=normal"]);
  if (!output) return [];
  return output
    .split("\n")
    .map((line) => line.slice(3).trim())
    .filter(Boolean);
}

export function currentBranch() {
  try {
    const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
    return branch === "HEAD" ? null : branch;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* GitHub                                                                     */
/* -------------------------------------------------------------------------- */

export function githubToken(env = process.env) {
  return (
    env.RELEASE_GITHUB_TOKEN?.trim() ||
    env.GITHUB_TOKEN?.trim() ||
    env.GH_TOKEN?.trim() ||
    null
  );
}

const RETRYABLE_STATUS = new Set([403, 429, 500, 502, 503, 504]);

/**
 * GitHub GET with bounded retries.
 *
 * The build guard runs on shared Vercel builder IPs, where the 60 req/hour
 * unauthenticated limit is a realistic failure. Setting `RELEASE_GITHUB_TOKEN`
 * as a Vercel environment variable raises it to 5000/hour.
 */
export async function githubGet(path, options = {}) {
  const { token = githubToken(), attempts = 3, expectMissing = false } = options;

  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "oneread-release-guard",
    "x-github-api-version": "2022-11-28",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${GITHUB_API}${path}`, { headers });

      if (response.ok) return await response.json();

      if (expectMissing && response.status === 404) return null;

      const body = await response.text().catch(() => "");
      lastError = new Error(
        `GitHub ${response.status} for ${path}${body ? `: ${body.slice(0, 200)}` : ""}`,
      );

      if (!RETRYABLE_STATUS.has(response.status)) throw lastError;
    } catch (error) {
      lastError = error;
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  throw lastError ?? new Error(`GitHub request failed for ${path}`);
}

/**
 * Is `sha` published on GitHub and reachable from `main`?
 *
 * `compare/main...sha` answers both at once: `identical` means it *is* the tip,
 * `behind` means main contains it. `ahead`/`diverged` mean the commit exists but
 * was never merged, and a 404 means GitHub has never seen it.
 */
export async function commitIsOnMain(sha, options = {}) {
  const result = await githubGet(
    `/repos/${REPO_OWNER}/${REPO_NAME}/compare/${PRODUCTION_BRANCH}...${sha}`,
    { ...options, expectMissing: true },
  );

  if (result === null) return { onMain: false, status: "unknown" };
  return { onMain: result.status === "identical" || result.status === "behind", status: result.status };
}

export async function fetchCommitTree(sha, options = {}) {
  const tree = await githubGet(
    `/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${sha}?recursive=1`,
    options,
  );

  if (tree?.truncated) {
    throw new Error(
      `GitHub truncated the tree listing for ${sha}; the repository grew past a single tree page and the build guard needs pagination.`,
    );
  }

  return tree?.tree ?? [];
}

/* -------------------------------------------------------------------------- */
/* Vercel                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `VERCEL_TOKEN` and `VERCEL_SCOPE` are how CI authenticates; locally the
 * developer's `vercel login` session and linked `.vercel/` directory cover both.
 */
function vercelArgs(args, env) {
  const extra = [];
  if (env.VERCEL_TOKEN) extra.push("--token", env.VERCEL_TOKEN);
  if (env.VERCEL_SCOPE) extra.push("--scope", env.VERCEL_SCOPE);
  return [...args, ...extra];
}

function vercel(args, env = process.env) {
  return execFileSync("vercel", vercelArgs(args, env), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function parseJsonOutput(raw) {
  // The CLI prints progress lines to stderr, but older versions occasionally
  // leak a banner to stdout; start from the first brace to stay tolerant.
  const start = raw.indexOf("{");
  if (start < 0) throw new Error(`Vercel CLI returned no JSON:\n${raw.slice(0, 400)}`);
  return JSON.parse(raw.slice(start));
}

/**
 * Recent production deployments, newest first, following the CLI's cursor.
 *
 * `pages` bounds the walk: the audit only needs enough history to spot a
 * duplicate SHA and to locate the deployment currently behind the domain.
 */
export function listProductionDeployments({ pages = 3, env = process.env } = {}) {
  const deployments = [];
  let next = null;

  for (let page = 0; page < pages; page += 1) {
    const args = [
      "list",
      REPO_NAME,
      "--environment",
      "production",
      "--format",
      "json",
      ...(next ? ["--next", String(next)] : []),
    ];

    const payload = parseJsonOutput(vercel(args, env));
    deployments.push(...(payload.deployments ?? []));

    next = payload.pagination?.next ?? null;
    if (!next) break;
  }

  return deployments;
}

/** The deployment a hostname currently resolves to. */
export function inspectDeployment(target, env = process.env) {
  return parseJsonOutput(vercel(["inspect", target, "--format", "json"], env));
}

export function deployProduction({ reason, sha, env = process.env }) {
  const args = vercelArgs(
    [
      "deploy",
      "--prod",
      "--yes",
      "--meta",
      `releaseChannel=${EMERGENCY_CHANNEL}`,
      "--meta",
      `releaseReason=${reason}`,
      "--meta",
      `releaseSha=${sha}`,
    ],
    env,
  );

  execFileSync("vercel", args, { stdio: "inherit" });
}
