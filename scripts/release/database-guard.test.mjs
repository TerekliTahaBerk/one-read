import { describe, expect, it, vi } from "vitest";

import { runProductionDatabaseGuard } from "./database-guard.mjs";

const productionEnv = {
  VERCEL: "1",
  VERCEL_ENV: "production",
  VERCEL_GIT_COMMIT_REF: "main",
  PRISMA_DATABASE_URL: "postgresql://example.invalid/oneread",
};

describe("production database release guard", () => {
  it("does not touch a database outside a Vercel production build", () => {
    const run = vi.fn();

    expect(runProductionDatabaseGuard({ env: {}, run, log: vi.fn() })).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it("blocks production when the database URL is unavailable", () => {
    const run = vi.fn();

    expect(
      runProductionDatabaseGuard({
        env: { ...productionEnv, PRISMA_DATABASE_URL: "" },
        run,
        log: vi.fn(),
      }),
    ).toBe(1);
    expect(run).not.toHaveBeenCalled();
  });

  it("deploys migrations and exposes their clean status before allowing the build", () => {
    const run = vi.fn(() => ({ status: 0 }));

    expect(runProductionDatabaseGuard({ env: productionEnv, run, log: vi.fn() })).toBe(0);
    expect(run.mock.calls).toEqual([
      [["migrate", "deploy"]],
      [["migrate", "status"]],
    ]);
  });

  it("blocks the build immediately when migration deploy fails", () => {
    const run = vi.fn(() => ({ status: 1 }));

    expect(runProductionDatabaseGuard({ env: productionEnv, run, log: vi.fn() })).toBe(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("blocks the build when the reported migration state is not clean", () => {
    const run = vi
      .fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 1 });

    expect(runProductionDatabaseGuard({ env: productionEnv, run, log: vi.fn() })).toBe(1);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
