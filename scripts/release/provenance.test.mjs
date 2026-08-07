import { describe, expect, it } from "vitest";

import {
  checkProductionDeployment,
  classifyDeploymentSource,
  describeDeployment,
  evaluateBuildEnvironment,
  evaluateDeployPreflight,
  findDuplicateProductionShas,
  isProductionAliasHost,
  isProductionBuild,
  partitionByEnforcement,
} from "./provenance.mjs";

const SHA = "2702878b13889cedf865583f5ab1ebeae773fcbf";
const OTHER_SHA = "2dce58ee1c4a4d5a5e5b6e0f7c9a1b2d3e4f5a6b";

function deployment(base, { meta, ...overrides } = {}) {
  return { ...base, ...overrides, meta: { ...base.meta, ...meta } };
}

/** Shape of a Vercel Git-integration production deployment. */
function gitDeployment(overrides = {}) {
  return deployment(
    {
      url: "one-read-ej3lp2zjx-tereklitahaberks-projects.vercel.app",
      state: "READY",
      target: "production",
      createdAt: Date.parse("2026-08-08T10:00:00Z"),
      meta: {
        githubCommitSha: SHA,
        githubCommitRef: "main",
        githubDeployment: "1",
        branchAlias: "one-read-git-main-tereklitahaberks-projects.vercel.app",
        repoPushedAt: "1786103031000",
      },
    },
    overrides,
  );
}

/** Shape of a `vercel --prod` deployment made from a linked local checkout. */
function cliDeployment(overrides = {}) {
  return deployment(
    {
      url: "one-read-grorpxzwy-tereklitahaberks-projects.vercel.app",
      state: "READY",
      target: "production",
      createdAt: Date.parse("2026-08-08T11:00:00Z"),
      meta: {
        githubCommitSha: SHA,
        githubCommitRef: "main",
        // The CLI copies this from the local repo, so it does not identify a
        // Git-integration deployment.
        githubDeployment: "1",
      },
    },
    overrides,
  );
}

const codes = (violations) => violations.map((violation) => violation.code);

describe("classifyDeploymentSource", () => {
  it("treats branchAlias + repoPushedAt as the Git integration signature", () => {
    expect(classifyDeploymentSource(gitDeployment().meta)).toBe("git");
  });

  it("does not trust githubDeployment, which the CLI also sets", () => {
    expect(cliDeployment().meta.githubDeployment).toBe("1");
    expect(classifyDeploymentSource(cliDeployment().meta)).toBe("cli");
  });

  it("treats a half-populated meta as CLI", () => {
    expect(classifyDeploymentSource({ branchAlias: "x" })).toBe("cli");
    expect(classifyDeploymentSource({ repoPushedAt: "1" })).toBe("cli");
    expect(classifyDeploymentSource(undefined)).toBe("cli");
  });
});

describe("describeDeployment", () => {
  it("flattens the fields the rules need", () => {
    const summary = describeDeployment(gitDeployment());
    expect(summary).toMatchObject({ sha: SHA, ref: "main", dirty: false, source: "git" });
  });

  it("reads gitDirty as the string Vercel stores", () => {
    expect(describeDeployment(cliDeployment({ meta: { gitDirty: "1" } })).dirty).toBe(true);
    expect(describeDeployment(cliDeployment({ meta: { gitDirty: "0" } })).dirty).toBe(false);
  });
});

describe("checkProductionDeployment", () => {
  it("accepts a clean Git-integration deployment on main", () => {
    expect(checkProductionDeployment(describeDeployment(gitDeployment()), { shaOnMain: true }))
      .toEqual([]);
  });

  it("rejects a deployment built from a dirty working tree", () => {
    const summary = describeDeployment(cliDeployment({ meta: { gitDirty: "1" } }));
    expect(codes(checkProductionDeployment(summary)))
      .toEqual(["dirty_working_tree", "unsanctioned_cli_deployment"]);
  });

  it("rejects an unstamped CLI deployment even when it is clean", () => {
    const summary = describeDeployment(cliDeployment());
    expect(codes(checkProductionDeployment(summary))).toEqual(["unsanctioned_cli_deployment"]);
  });

  it("accepts a CLI deployment stamped by the emergency flow", () => {
    const summary = describeDeployment(
      cliDeployment({ meta: { releaseChannel: "emergency", releaseReason: "git outage" } }),
    );
    expect(checkProductionDeployment(summary, { shaOnMain: true })).toEqual([]);
  });

  it("rejects production builds from a branch other than main", () => {
    const summary = describeDeployment(gitDeployment({ meta: { githubCommitRef: "feature/x" } }));
    expect(codes(checkProductionDeployment(summary))).toEqual(["wrong_branch"]);
  });

  it("rejects a deployment with no commit at all", () => {
    const summary = describeDeployment({ url: "x", target: "production", meta: {} });
    expect(codes(checkProductionDeployment(summary)))
      .toEqual(["missing_commit_sha", "wrong_branch", "unsanctioned_cli_deployment"]);
  });

  it("rejects a commit GitHub cannot reach from main", () => {
    const summary = describeDeployment(gitDeployment());
    expect(codes(checkProductionDeployment(summary, { shaOnMain: false })))
      .toEqual(["commit_not_on_main"]);
  });

  it("stays quiet about reachability when the caller did not check", () => {
    const summary = describeDeployment(gitDeployment());
    expect(checkProductionDeployment(summary)).toEqual([]);
  });
});

describe("findDuplicateProductionShas", () => {
  it("groups a commit deployed twice", () => {
    const summaries = [gitDeployment(), cliDeployment()].map(describeDeployment);
    const duplicates = findDuplicateProductionShas(summaries);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].sha).toBe(SHA);
    expect(duplicates[0].deployments).toHaveLength(2);
  });

  it("is quiet when every commit deployed once", () => {
    const summaries = [
      gitDeployment(),
      gitDeployment({ meta: { githubCommitSha: OTHER_SHA } }),
    ].map(describeDeployment);

    expect(findDuplicateProductionShas(summaries)).toEqual([]);
  });

  it("ignores deployments without a usable commit", () => {
    const summaries = [
      describeDeployment({ url: "a", meta: {} }),
      describeDeployment({ url: "b", meta: {} }),
    ];
    expect(findDuplicateProductionShas(summaries)).toEqual([]);
  });
});

describe("partitionByEnforcement", () => {
  const enforcedFrom = Date.parse("2026-08-07T00:00:00Z");

  it("separates pre-existing history from governed deployments", () => {
    const old = describeDeployment(
      gitDeployment({ createdAt: Date.parse("2026-07-27T10:00:00Z") }),
    );
    const recent = describeDeployment(gitDeployment());

    const { enforced, historical } = partitionByEnforcement([old, recent], enforcedFrom);
    expect(historical).toEqual([old]);
    expect(enforced).toEqual([recent]);
  });
});

describe("evaluateDeployPreflight", () => {
  const base = {
    headSha: SHA,
    dirtyPaths: [],
    headIsOnRemoteMain: true,
    remoteMainSha: SHA,
    productionShas: [],
    reason: "vercel git integration outage, INC-14",
  };

  it("allows a clean, published, not-yet-deployed commit with a reason", () => {
    expect(evaluateDeployPreflight(base).violations).toEqual([]);
  });

  it("blocks a dirty working tree", () => {
    const { violations } = evaluateDeployPreflight({ ...base, dirtyPaths: ["lib/prisma.ts"] });
    expect(codes(violations)).toEqual(["dirty_working_tree"]);
    expect(violations[0].message).toContain("lib/prisma.ts");
  });

  it("blocks a commit that never reached main", () => {
    const { violations } = evaluateDeployPreflight({ ...base, headIsOnRemoteMain: false });
    expect(codes(violations)).toEqual(["head_not_on_main"]);
  });

  it("blocks a second production deployment of the same commit", () => {
    const { violations } = evaluateDeployPreflight({ ...base, productionShas: [SHA] });
    expect(codes(violations)).toEqual(["duplicate_production_sha"]);
  });

  it("requires a substantive reason", () => {
    expect(codes(evaluateDeployPreflight({ ...base, reason: "" }).violations))
      .toEqual(["missing_emergency_reason"]);
    expect(codes(evaluateDeployPreflight({ ...base, reason: "fix" }).violations))
      .toEqual(["missing_emergency_reason"]);
  });

  it("allows a rollback to an older commit but says so", () => {
    const { violations, notes } = evaluateDeployPreflight({
      ...base,
      headSha: OTHER_SHA,
      remoteMainSha: SHA,
    });

    expect(violations).toEqual([]);
    expect(notes.join(" ")).toContain("roll production back");
  });
});

describe("evaluateBuildEnvironment", () => {
  const env = {
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_SHA: SHA,
    VERCEL_GIT_COMMIT_REF: "main",
    VERCEL_GIT_REPO_OWNER: "TerekliTahaBerk",
    VERCEL_GIT_REPO_SLUG: "one-read",
  };

  it("accepts a production build of main in this repository", () => {
    expect(evaluateBuildEnvironment(env).violations).toEqual([]);
  });

  it("rejects a build with no commit metadata", () => {
    const { violations } = evaluateBuildEnvironment({ ...env, VERCEL_GIT_COMMIT_SHA: "" });
    expect(codes(violations)).toContain("missing_commit_sha");
  });

  it("rejects an abbreviated commit", () => {
    const { violations } = evaluateBuildEnvironment({ ...env, VERCEL_GIT_COMMIT_SHA: "2702878" });
    expect(codes(violations)).toContain("missing_commit_sha");
  });

  it("rejects a production build of a feature branch", () => {
    const { violations } = evaluateBuildEnvironment({ ...env, VERCEL_GIT_COMMIT_REF: "feature/x" });
    expect(codes(violations)).toContain("wrong_branch");
  });

  it("rejects a build of a different repository", () => {
    const { violations } = evaluateBuildEnvironment({ ...env, VERCEL_GIT_REPO_SLUG: "one-read-fork" });
    expect(codes(violations)).toContain("wrong_repository");
  });

  it("prefers VERCEL_TARGET_ENV when both are present", () => {
    expect(evaluateBuildEnvironment({ ...env, VERCEL_TARGET_ENV: "preview" }).target)
      .toBe("preview");
  });
});

describe("isProductionBuild", () => {
  it("is true only for production on Vercel", () => {
    expect(isProductionBuild({ VERCEL: "1", VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionBuild({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe(false);
    expect(isProductionBuild({ VERCEL_ENV: "production" })).toBe(false);
    expect(isProductionBuild({})).toBe(false);
  });
});

describe("isProductionAliasHost", () => {
  it("recognises the apex and www hosts in any URL shape", () => {
    expect(isProductionAliasHost("oneread.email")).toBe(true);
    expect(isProductionAliasHost("https://www.oneread.email/")).toBe(true);
  });

  it("does not treat a preview or per-deployment host as production", () => {
    expect(isProductionAliasHost("one-read-git-main-x.vercel.app")).toBe(false);
    expect(isProductionAliasHost("one-read.vercel.app")).toBe(false);
  });
});
