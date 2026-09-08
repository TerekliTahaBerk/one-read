import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRuntimeSettings: vi.fn(),
  runEditorialCron: vi.fn(),
  dispatchDueEditorialIssues: vi.fn(),
}));

vi.mock("@/lib/admin/settings-store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/settings-store")>();
  return { ...original, getRuntimeSettings: mocks.getRuntimeSettings };
});
vi.mock("@/lib/admin/editorial-cron", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/editorial-cron")>();
  return { ...original, runEditorialCron: mocks.runEditorialCron };
});
vi.mock("@/lib/one-article/editorial", () => ({
  dispatchDueEditorialIssues: mocks.dispatchDueEditorialIssues,
}));

import { GET, POST } from "./route";

const SETTINGS = {
  degraded: false,
  controls: {
    oneArticle: { cronEnabled: true, dryRun: false, requireApproval: true },
    oneNews: { cronEnabled: false, dryRun: false, requireApproval: true },
  },
  minArticleScore: 0.7,
  minSummaryConfidence: 75,
  minDeliveryScore: 0.6,
  oneArticleSendDays: "MON,TUE,WED,THU,FRI",
  oneNewsSendDays: "MON,WED,FRI",
};

describe("OneArticle daily cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
    mocks.getRuntimeSettings.mockResolvedValue(SETTINGS);
    mocks.runEditorialCron.mockResolvedValue(Response.json({ ok: true }));
  });

  const authorized = (handler: typeof GET) =>
    handler(new Request("https://example.test/api/cron/daily", {
      method: handler === POST ? "POST" : "GET",
      headers: { authorization: "Bearer cron-test-secret" },
    }));

  it.each([GET, POST])("fails closed before database or dispatch work for unauthorized requests", async (handler) => {
    const response = await handler(new Request("https://example.test/api/cron/daily"));
    expect(response.status).toBe(401);
    expect(mocks.getRuntimeSettings).not.toHaveBeenCalled();
    expect(mocks.runEditorialCron).not.toHaveBeenCalled();
    expect(mocks.dispatchDueEditorialIssues).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(new Request("https://example.test/api/cron/daily", {
      headers: { authorization: "Bearer undefined" },
    }));
    expect(response.status).toBe(401);
    expect(mocks.getRuntimeSettings).not.toHaveBeenCalled();
  });

  it.each([GET, POST])("intentionally supports authorized GET and POST", async (handler) => {
    const response = await authorized(handler);
    expect(response.status).toBe(200);
    expect(mocks.getRuntimeSettings).toHaveBeenCalledTimes(1);
    expect(mocks.runEditorialCron).toHaveBeenCalledWith(expect.objectContaining({
      route: "/api/cron/daily",
      sendDays: [1, 2, 3, 4, 5],
      controls: SETTINGS.controls.oneArticle,
    }));
  });

  it("passes the panel-resolved publication days down to dispatch", async () => {
    mocks.getRuntimeSettings.mockResolvedValue({ ...SETTINGS, oneArticleSendDays: "TUE,THU" });
    await authorized(GET);

    const config = mocks.runEditorialCron.mock.calls[0][0];
    expect(config.sendDays).toEqual([2, 4]);
    await config.dispatch();
    expect(mocks.dispatchDueEditorialIssues).toHaveBeenCalledWith(
      expect.any(Date),
      { sendDays: ["TUE", "THU"] },
    );
  });

  it("reports a degraded settings read so the run row records it", async () => {
    mocks.getRuntimeSettings.mockResolvedValue({ ...SETTINGS, degraded: true });
    await authorized(GET);
    expect(mocks.runEditorialCron).toHaveBeenCalledWith(
      expect.objectContaining({ controlsDegraded: true }),
    );
  });
});
