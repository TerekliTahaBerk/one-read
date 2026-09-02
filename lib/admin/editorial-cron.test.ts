import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

const observability = vi.hoisted(() => ({
  reportCronFailure: vi.fn(),
  reportSettingsFallback: vi.fn(),
}));
vi.mock("@/lib/observability", () => observability);
const { reportCronFailure } = observability;

const resend = vi.hoisted(() => ({
  sendDailyEmail: vi.fn(),
  getResendStatus: vi.fn(),
}));
vi.mock("@/lib/resend", () => resend);
const { sendDailyEmail, getResendStatus } = resend;

import { prisma as prismaImport } from "@/lib/prisma";
import { runEditorialCron, type EditorialCronConfig } from "./editorial-cron";
import { classifyRunFailure, reclaimStaleRuns } from "./operational-runs";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

/**
 * The production symptom this whole module exists for, reproduced exactly as
 * Prisma 5 raises it: a mid-query connection loss arrives as a
 * `PrismaClientInitializationError` with **no** `code` or `errorCode`, and the
 * real cause sits behind an invocation header and a source code frame. Anything
 * that classifies only on `error.code` silently misreads this as permanent.
 */
function connectionError(): Error {
  return new Error(
    [
      "Invalid `client.operationalRun.create()` invocation in",
      "/var/task/lib/admin/operational-runs.ts:24:33",
      "",
      "  22 export async function startRun(input: StartRunInput) {",
      "  23   return prisma.operationalRun.create({",
      "→ 24     data: {",
      "Can't reach database server at `db.prisma.io`:`5432`",
      "",
      "Please make sure your database server is running at `db.prisma.io`:`5432`.",
    ].join("\n"),
  );
}

/** A Prisma error that does carry a code, e.g. a pool timeout or a constraint. */
function codedError(code: string, message: string): Error {
  const error = new Error(message);
  (error as unknown as { code: string }).code = code;
  return error;
}

const emptyResult = { issues: 0, recipients: 0, sent: 0, failed: 0, skipped: 0 };

function config(overrides: Partial<EditorialCronConfig> = {}): EditorialCronConfig {
  return {
    productKey: "one-film",
    productName: "OneFilm",
    route: "/api/cron/one-film",
    auditAction: "oneFilm.editorial.dispatch",
    sendDays: [6],
    controls: { cronEnabled: true, dryRun: false, requireApproval: true },
    dispatch: vi.fn(async () => ({ ...emptyResult, issues: 1, recipients: 3, sent: 3 })),
    // No real backoff sleeps in tests; the retry policy itself is asserted below.
    retry: { attempts: 3, baseDelayMs: 0 },
    ...overrides,
  };
}

function healthyDatabase(): void {
  prisma.operationalRun.updateMany.mockResolvedValue({ count: 0 } as never);
  prisma.operationalRun.create.mockResolvedValue({ id: "run_1" } as never);
  prisma.operationalRun.update.mockResolvedValue({ id: "run_1" } as never);
  prisma.adminAuditLog.create.mockResolvedValue({ id: "audit_1" } as never);
  prisma.setting.create.mockResolvedValue({ key: "k" } as never);
}

describe("runEditorialCron", () => {
  beforeEach(() => {
    mockReset(prisma);
    vi.clearAllMocks();
    process.env.ADMIN_EMAIL = "ops@example.com";
    getResendStatus.mockReturnValue({ hasApiKey: true });
    sendDailyEmail.mockResolvedValue({ messageId: "msg_1" });
    healthyDatabase();
  });

  it("dispatches and closes the run when everything is healthy", async () => {
    const cfg = config();
    const response = await runEditorialCron(cfg);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      attentionRequired: false,
      outcome: "healthy",
      issues: 1,
      recipients: 3,
      sent: 3,
      failed: 0,
      skipped: 0,
    });
    expect(cfg.dispatch).toHaveBeenCalledTimes(1);
    expect(prisma.operationalRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run_1" },
        data: expect.objectContaining({ status: "SUCCESS", sentCount: 3 }),
      }),
    );
    expect(reportCronFailure).not.toHaveBeenCalled();
  });

  it("records partial delivery as attention-required without returning an unsafe 500", async () => {
    const cfg = config({
      dispatch: vi.fn(async () => ({ issues: 1, recipients: 2, sent: 1, failed: 1, skipped: 0 })),
    });
    const response = await runEditorialCron(cfg);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      attentionRequired: true,
      outcome: "partial_failure",
      failed: 1,
    });
    expect(prisma.operationalRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "FAILED", failedCount: 1, error: "partial_delivery_failure" }),
    }));
  });

  describe("when the database is unreachable", () => {
    beforeEach(() => {
      prisma.operationalRun.updateMany.mockRejectedValue(connectionError());
      prisma.operationalRun.create.mockRejectedValue(connectionError());
      prisma.operationalRun.update.mockRejectedValue(connectionError());
    });

    it("fails in a controlled way instead of dispatching", async () => {
      const cfg = config();
      const response = await runEditorialCron(cfg);

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: "Cron could not start",
        code: "P1001",
        stage: "start",
        retryable: true,
        runId: null,
        runRecorded: false,
      });
      expect(cfg.dispatch).not.toHaveBeenCalled();
    });

    it("still emits the database-independent error signal", async () => {
      await runEditorialCron(config());

      expect(reportCronFailure).toHaveBeenCalledWith(
        expect.objectContaining({
          productKey: "one-film",
          route: "/api/cron/one-film",
          stage: "start",
          code: "P1001",
          transient: true,
          runId: null,
          attempts: 3,
        }),
      );
    });

    it("alerts the admin by email and says no run row exists", async () => {
      await runEditorialCron(config());

      expect(sendDailyEmail).toHaveBeenCalledTimes(1);
      const [{ to, subject, text }] = sendDailyEmail.mock.calls[0] as [
        { to: string; subject: string; text: string },
      ];
      expect(to).toBe("ops@example.com");
      expect(subject).toContain("OneFilm");
      expect(text).toContain("P1001");
      expect(text).toContain("No run row was written");
    });

    it("retries the run-open a bounded number of times", async () => {
      await runEditorialCron(config());
      expect(prisma.operationalRun.create).toHaveBeenCalledTimes(3);
    });

    it("never bypasses the alert layer when the cron toggle is off", async () => {
      const response = await runEditorialCron(
        config({ controls: { cronEnabled: false, dryRun: false, requireApproval: true } }),
      );

      expect(response.status).toBe(500);
      expect(reportCronFailure).toHaveBeenCalledTimes(1);
    });
  });

  it("recovers when the connection returns mid-retry, dispatching exactly once", async () => {
    prisma.operationalRun.create
      .mockRejectedValueOnce(connectionError())
      .mockResolvedValue({ id: "run_1" } as never);
    const cfg = config();

    const response = await runEditorialCron(cfg);

    expect(response.status).toBe(200);
    expect(prisma.operationalRun.create).toHaveBeenCalledTimes(2);
    expect(cfg.dispatch).toHaveBeenCalledTimes(1);
  });

  it("does not retry a non-transient failure", async () => {
    prisma.operationalRun.create.mockRejectedValue(
      codedError("P2002", "Unique constraint failed"),
    );

    const response = await runEditorialCron(config());

    expect(prisma.operationalRun.create).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      code: "P2002",
      retryable: false,
    });
  });

  it("records a dispatch failure on the open run and alerts", async () => {
    const cfg = config({
      dispatch: vi.fn(async () => {
        throw new Error("resend refused the batch");
      }),
    });

    const response = await runEditorialCron(cfg);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      stage: "dispatch",
      runId: "run_1",
      runRecorded: true,
      retryable: false,
    });
    expect(prisma.operationalRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run_1" },
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("reports the failure even when the run row cannot be closed", async () => {
    const closed = () => codedError("P1017", "Server has closed the connection.");
    prisma.operationalRun.update.mockRejectedValue(closed());
    const cfg = config({
      dispatch: vi.fn(async () => {
        throw closed();
      }),
    });

    const response = await runEditorialCron(cfg);

    await expect(response.json()).resolves.toMatchObject({
      stage: "dispatch",
      code: "P1017",
      retryable: true,
      runRecorded: false,
    });
    expect(reportCronFailure).toHaveBeenCalledTimes(1);
  });

  it("keeps a delivered edition marked SUCCESS when post-send alerting throws", async () => {
    prisma.adminAuditLog.create.mockRejectedValue(connectionError());
    prisma.setting.create.mockRejectedValue(connectionError());
    const cfg = config();

    const response = await runEditorialCron(cfg);

    expect(response.status).toBe(200);
    expect(cfg.dispatch).toHaveBeenCalledTimes(1);
    expect(prisma.operationalRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) }),
    );
    expect(prisma.operationalRun.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
  });

  it("skips without dispatching when the panel disabled cron", async () => {
    const cfg = config({
      controls: { cronEnabled: false, dryRun: false, requireApproval: true },
    });

    const response = await runEditorialCron(cfg);

    await expect(response.json()).resolves.toEqual({
      ok: true,
      skipped: true,
      reason: "cron_disabled",
    });
    expect(cfg.dispatch).not.toHaveBeenCalled();
  });

  it("skips without dispatching in dry-run", async () => {
    const cfg = config({
      controls: { cronEnabled: true, dryRun: true, requireApproval: true },
    });

    const response = await runEditorialCron(cfg);

    await expect(response.json()).resolves.toEqual({
      ok: true,
      skipped: true,
      reason: "dry_run_enabled",
    });
    expect(cfg.dispatch).not.toHaveBeenCalled();
  });
});

describe("classifyRunFailure", () => {
  it("treats Prisma connection codes as transient", () => {
    for (const code of ["P1001", "P1002", "P1008", "P1017", "P2024", "P2034"]) {
      expect(classifyRunFailure(codedError(code, "database unavailable"))).toMatchObject({
        code,
        transient: true,
      });
    }
  });

  it("recovers P1001 from an uncoded PrismaClientInitializationError", () => {
    const classified = classifyRunFailure(connectionError());
    expect(classified.code).toBe("P1001");
    expect(classified.transient).toBe(true);
    // The cause must lead the message: it trails a source frame in the raw
    // text, so a naive truncation would drop it from the alert entirely.
    expect(classified.message).toMatch(/^Can't reach database server/);
    expect(classified.message).not.toContain("invocation");
    expect(classified.message).not.toContain("/var/task");
  });

  it("recovers a pool timeout from its wording", () => {
    expect(
      classifyRunFailure(
        new Error("Timed out fetching a new connection from the connection pool."),
      ),
    ).toMatchObject({ code: "P2024", transient: true });
  });

  it("treats a socket-level failure without a Prisma code as transient", () => {
    expect(classifyRunFailure(new Error("connect ECONNREFUSED 10.0.0.4:5432"))).toMatchObject({
      code: "unknown",
      transient: true,
    });
  });

  it("treats query and validation errors as permanent", () => {
    expect(
      classifyRunFailure(codedError("P2002", "Unique constraint failed on the fields: (`key`)")),
    ).toMatchObject({ code: "P2002", transient: false });
    expect(classifyRunFailure(new Error("RESEND_API_KEY is not configured"))).toMatchObject({
      transient: false,
    });
  });

  it("normalises non-Error throws", () => {
    expect(classifyRunFailure(null)).toEqual({
      code: "unknown",
      transient: false,
      message: "unknown_error",
    });
  });
});

describe("reclaimStaleRuns", () => {
  beforeEach(() => {
    mockReset(prisma);
  });

  it("fails runs the outage left open past the recovery window", async () => {
    prisma.operationalRun.updateMany.mockResolvedValue({ count: 2 } as never);
    const now = new Date("2026-08-07T09:00:00.000Z");

    await expect(reclaimStaleRuns("one-film", now)).resolves.toBe(2);
    expect(prisma.operationalRun.updateMany).toHaveBeenCalledWith({
      where: {
        productKey: "one-film",
        status: "RUNNING",
        startedAt: { lt: new Date("2026-08-07T08:45:00.000Z") },
      },
      data: expect.objectContaining({ status: "FAILED", finishedAt: now }),
    });
  });

  it("stays silent while the database is still down", async () => {
    prisma.operationalRun.updateMany.mockRejectedValue(connectionError());
    await expect(reclaimStaleRuns("one-article")).resolves.toBe(0);
  });
});
