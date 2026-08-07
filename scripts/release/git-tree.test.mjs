import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { diffTreeAgainstWorkspace, gitBlobSha1, makeIgnoreMatcher } from "./git-tree.mjs";

describe("gitBlobSha1", () => {
  it("matches git's own object id", () => {
    // Cross-checked against the real implementation rather than a copied
    // constant: if the header format ever drifts, this catches it.
    const contents = "one article, one film\n";
    const expected = execFileSync("git", ["hash-object", "--stdin"], {
      input: contents,
      encoding: "utf8",
    }).trim();

    expect(gitBlobSha1(contents)).toBe(expected);
  });

  it("hashes an empty file to git's well-known empty blob", () => {
    expect(gitBlobSha1("")).toBe("e69de29bb2d1d6434b8b29ae775ad8c2e48c5391");
  });

  it("hashes bytes, not characters", () => {
    const expected = execFileSync("git", ["hash-object", "--stdin"], {
      input: "yalnızca bir yazı\n",
      encoding: "utf8",
    }).trim();

    expect(gitBlobSha1(Buffer.from("yalnızca bir yazı\n", "utf8"))).toBe(expected);
  });
});

describe("diffTreeAgainstWorkspace", () => {
  const contents = { "lib/prisma.ts": "export const a = 1;\n", "README.md": "# OneRead\n" };
  const tree = Object.entries(contents).map(([path, body]) => ({
    path,
    type: "blob",
    mode: "100644",
    sha: gitBlobSha1(body),
  }));

  const readFrom = (files) => (path) =>
    path in files ? Buffer.from(files[path], "utf8") : null;

  it("passes when every tracked file matches the commit", () => {
    const diff = diffTreeAgainstWorkspace(tree, readFrom(contents));

    expect(diff.clean).toBe(true);
    expect(diff.checked).toBe(2);
  });

  it("catches an uncommitted edit — the gitDirty case", () => {
    const dirty = { ...contents, "lib/prisma.ts": "export const a = 2;\n" };
    const diff = diffTreeAgainstWorkspace(tree, readFrom(dirty));

    expect(diff.clean).toBe(false);
    expect(diff.modified.map((entry) => entry.path)).toEqual(["lib/prisma.ts"]);
  });

  it("catches a tracked file deleted from the deployed sources", () => {
    const diff = diffTreeAgainstWorkspace(tree, readFrom({ "README.md": contents["README.md"] }));

    expect(diff.clean).toBe(false);
    expect(diff.missing).toEqual(["lib/prisma.ts"]);
  });

  it("ignores untracked extras such as node_modules and .next", () => {
    const withExtras = { ...contents, ".next/build-manifest.json": "{}" };
    expect(diffTreeAgainstWorkspace(tree, readFrom(withExtras)).clean).toBe(true);
  });

  it("skips tree and submodule entries", () => {
    const mixed = [
      ...tree,
      { path: "app", type: "tree", mode: "040000", sha: "x" },
      { path: "vendor/dep", type: "commit", mode: "160000", sha: "y" },
    ];

    expect(diffTreeAgainstWorkspace(mixed, readFrom(contents)).checked).toBe(2);
  });

  it("skips symlinks, whose bytes are the target path rather than the file", () => {
    const withLink = [...tree, { path: "link", type: "blob", mode: "120000", sha: "z" }];
    const diff = diffTreeAgainstWorkspace(withLink, readFrom(contents));

    expect(diff.clean).toBe(true);
    expect(diff.skipped).toContainEqual({ path: "link", reason: "symlink" });
  });

  it("does not fail on files the deployment legitimately strips", () => {
    const withEnv = [...tree, { path: ".env", type: "blob", mode: "100644", sha: "e" }];
    const diff = diffTreeAgainstWorkspace(withEnv, readFrom(contents), {
      ignore: makeIgnoreMatcher([".env", ".env.*", ".vercel"]),
    });

    expect(diff.clean).toBe(true);
    expect(diff.missing).toEqual([]);
  });
});

describe("makeIgnoreMatcher", () => {
  const matches = makeIgnoreMatcher(["# comment", "", ".env", ".env.*", ".vercel"]);

  it("matches literal entries and their contents", () => {
    expect(matches(".env")).toBe(true);
    expect(matches(".vercel")).toBe(true);
    expect(matches(".vercel/project.json")).toBe(true);
  });

  it("matches a single path segment per wildcard", () => {
    expect(matches(".env.local")).toBe(true);
    expect(matches(".env.production")).toBe(true);
  });

  it("covers .env.example, which is tracked in git but stripped from deploys", () => {
    // Without this the build guard would report the repo's own committed
    // example file as missing on every production build.
    expect(matches(".env.example")).toBe(true);
  });

  it("leaves unrelated paths alone", () => {
    expect(matches("lib/prisma.ts")).toBe(false);
    expect(matches("app/env.ts")).toBe(false);
    expect(matches("docs/.environment")).toBe(false);
  });
});
