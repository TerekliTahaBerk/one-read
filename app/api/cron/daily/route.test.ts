import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readControls: vi.fn(),
  runEditorialCron: vi.fn(),
  dispatchDueEditorialIssues: vi.fn(),
}));

vi.mock("@/lib/admin/settings-store", () => ({ readControls: mocks.readControls }));
vi.mock("@/lib/admin/editorial-cron", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/editorial-cron")>();
  return { ...original, runEditorialCron: mocks.runEditorialCron };
});
vi.mock("@/lib/one-article/editorial", () => ({
  dispatchDueEditorialIssues: mocks.dispatchDueEditorialIssues,
}));

import { GET, POST } from "./route";

describe("OneArticle daily cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
    mocks.readControls.mockResolvedValue({
      degraded: false,
      controls: {
        oneArticle: { cronEnabled: true, dryRun: false, requireApproval: true },
      },
    });
    mocks.runEditorialCron.mockResolvedValue(Response.json({ ok: true }));
  });

  it.each([GET, POST])("fails closed before database or dispatch work for unauthorized requests", async (handler) => {
    const response = await handler(new Request("https://example.test/api/cron/daily"));
    expect(response.status).toBe(401);
    expect(mocks.readControls).not.toHaveBeenCalled();
    expect(mocks.runEditorialCron).not.toHaveBeenCalled();
    expect(mocks.dispatchDueEditorialIssues).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("https://example.test/api/cron/daily", {
      headers: { authorization: "Bearer undefined" },
    }));
    expect(response.status).toBe(401);
    expect(mocks.readControls).not.toHaveBeenCalled();
  });

  it.each([GET, POST])("intentionally supports authorized GET and POST", async (handler) => {
    const response = await handler(new Request("https://example.test/api/cron/daily", {
      method: handler === POST ? "POST" : "GET",
      headers: { authorization: "Bearer cron-test-secret" },
    }));
    expect(response.status).toBe(200);
    expect(mocks.readControls).toHaveBeenCalledTimes(1);
    expect(mocks.runEditorialCron).toHaveBeenCalledWith(expect.objectContaining({
      route: "/api/cron/daily",
      sendDays: [1, 2, 3, 4, 5],
      dispatch: mocks.dispatchDueEditorialIssues,
    }));
  });
});
