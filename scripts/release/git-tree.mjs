/**
 * OneRead — "is this build actually the commit it claims to be?"
 *
 * Vercel records `gitDirty=1` on a deployment created from an uncommitted
 * working tree, but that flag lives in the deployment record, not in the build
 * environment — a build cannot read its own `meta`. So the build-time guard
 * proves the point directly instead: it fetches the Git tree of the claimed
 * commit from GitHub and compares every tracked blob against the files it was
 * handed. If a single tracked file differs, the artifact is not reproducible
 * from that commit and the build must fail.
 *
 * Git blob hashing is deliberately reimplemented here (11 lines) rather than
 * shelled out to `git`: Vercel's builders have no `.git` directory and no
 * guarantee of a `git` binary.
 */

import { createHash } from "node:crypto";

/** Git's object id for a file: sha1("blob <bytelength>\0" + contents). */
export function gitBlobSha1(contents) {
  const body = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  const header = Buffer.from(`blob ${body.length}\0`, "utf8");
  return createHash("sha1").update(header).update(body).digest("hex");
}

/** Symlinks: `readFile` follows them, so their bytes never match the blob. */
const SYMLINK_MODE = "120000";

/**
 * Compares a GitHub tree listing against the files on disk.
 *
 * @param entries  Raw `git/trees?recursive=1` entries.
 * @param readBlob `(path) => Buffer | null` — null when the file is absent.
 * @param options.ignore `(path) => boolean` for paths the deploy strips
 *        (`.vercelignore`), which are legitimately absent from a build.
 *
 * Only tracked files are inspected. Untracked extras (node_modules, .next, a
 * scratch file someone left behind) are invisible to this check — the guard
 * catches modified and deleted tracked files, which is what a dirty deploy
 * produces in practice.
 */
export function diffTreeAgainstWorkspace(entries, readBlob, options = {}) {
  const ignore = options.ignore ?? (() => false);

  const modified = [];
  const missing = [];
  const skipped = [];
  let checked = 0;

  for (const entry of entries ?? []) {
    if (!entry || entry.type !== "blob" || typeof entry.path !== "string") continue;

    if (entry.mode === SYMLINK_MODE) {
      skipped.push({ path: entry.path, reason: "symlink" });
      continue;
    }

    if (ignore(entry.path)) {
      skipped.push({ path: entry.path, reason: "excluded from deployment" });
      continue;
    }

    const contents = readBlob(entry.path);
    if (contents === null || contents === undefined) {
      missing.push(entry.path);
      continue;
    }

    checked += 1;
    const actual = gitBlobSha1(contents);
    if (actual !== entry.sha) {
      modified.push({ path: entry.path, expected: entry.sha, actual });
    }
  }

  return { checked, modified, missing, skipped, clean: modified.length === 0 && missing.length === 0 };
}

/**
 * Minimal `.vercelignore` matcher — enough for the patterns this repo uses
 * (`.env`, `.env.*`, `.vercel`). Anything fancier should be added with a test.
 */
export function makeIgnoreMatcher(patterns) {
  const matchers = (patterns ?? [])
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((pattern) => {
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, "[^/]");
      return new RegExp(`^${escaped}(/.*)?$`);
    });

  return (path) => matchers.some((matcher) => matcher.test(path));
}

/**
 * Vercel consumes project configuration before the user build starts and may
 * materialize `vercel.json` differently in the build workspace. Comparing that
 * platform-managed copy byte-for-byte with Git therefore creates a false dirty
 * result. The effective build command is still protected: reaching the guard
 * proves that Vercel invoked it.
 */
const PLATFORM_MANAGED_PATHS = new Set(["vercel.json"]);

export function makeProvenanceIgnoreMatcher(patterns) {
  const ignoredByDeployment = makeIgnoreMatcher(patterns);
  return (path) => PLATFORM_MANAGED_PATHS.has(path) || ignoredByDeployment(path);
}
