import { spawnSync } from "node:child_process";

import { isProductionBuild } from "./provenance.mjs";

function defaultRun(args) {
  return spawnSync("npx", ["--no-install", "prisma", ...args], {
    env: process.env,
    stdio: "inherit",
  });
}

/**
 * Bring the production database forward before a new Prisma client is built.
 * Prisma's advisory lock makes concurrent production builds safe, while
 * migrate deploy remains idempotent when a Vercel build is retried.
 */
export function runProductionDatabaseGuard({ env = process.env, run = defaultRun, log = console.log } = {}) {
  if (!isProductionBuild(env)) {
    log("[database-guard] Not a Vercel production build — production migrations skipped.");
    return 0;
  }

  if (!env.PRISMA_DATABASE_URL) {
    log("[database-guard] PRODUCTION BUILD BLOCKED: PRISMA_DATABASE_URL is not configured.");
    log("[database-guard] A release cannot prove or update its migration state without the production datasource.");
    return 1;
  }

  log("[database-guard] Applying committed migrations before building the production artifact.");
  const deploy = run(["migrate", "deploy"]);
  if (deploy.error || deploy.status !== 0) {
    log(`[database-guard] PRODUCTION BUILD BLOCKED: prisma migrate deploy failed${deploy.error ? `: ${deploy.error.message}` : "."}`);
    return 1;
  }

  log("[database-guard] Migration deploy completed; publishing the migration state.");
  const status = run(["migrate", "status"]);
  if (status.error || status.status !== 0) {
    log(`[database-guard] PRODUCTION BUILD BLOCKED: prisma migrate status is not clean${status.error ? `: ${status.error.message}` : "."}`);
    return 1;
  }

  log("[database-guard] Production migration state is clean — application build may continue.");
  return 0;
}
