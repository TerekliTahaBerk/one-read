import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRuntimeSettings: vi.fn(),
  runEditorialCron: vi.fn(),
  dispatchDueOneNewsIssues: vi.fn(),
}));

vi.mock("@/lib/admin/settings-store", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/settings-store")>();
  return { ...original, getRuntimeSettings: mocks.getRuntimeSettings };
});
vi.mock("@/lib/admin/editorial-cron", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/admin/editorial-cron")>();
  return { ...original, runEditorialCron: mocks.runEditorialCron };
});
vi.mock("@/lib/one-news/delivery", () => ({
  dispatchDueOneNewsIssues: mocks.dispatchDueOneNewsIssues,
}));

import { GET } from "./route";

const SETTINGS = {
  degraded: false,
  controls: {
    oneArticle: { cronEnabled: true, dryRun: false, requireApproval: true },
    oneNews: { cronEnabled: true, dryRun: false, requireApproval: true },
  },
  minArticleScore: 0.7,
  minSummaryConfidence: 75,
  minDeliveryScore: 0.6,
  oneArticleSendDays: "MON,TUE,WED,THU,FRI",
  oneNewsSendDays: "MON,WED,FRI",
};

const authorized = () =>
  GET(new Request("https://example.test/api/cron/news", {
    headers: { authorization: "Bearer cron-test-secret" },
  }));

describe("OneNews cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
    mocks.getRuntimeSettings.mockResolvedValue(SETTINGS);
    mocks.runEditorialCron.mockResolvedValue(Response.json({ ok: true }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fails closed before reading settings for unauthorized requests", async () => {
    const response = await GET(new Request("https://example.test/api/cron/news"));
    expect(response.status).toBe(401);
    expect(mocks.getRuntimeSettings).not.toHaveBeenCalled();
  });

  it("takes enablement and dry-run from the panel rather than the environment", async () => {
    delete process.env.ONENEWS_DELIVERY_ENABLED;
    mocks.getRuntimeSettings.mockResolvedValue({
      ...SETTINGS,
      controls: {
        ...SETTINGS.controls,
        oneNews: { cronEnabled: true, dryRun: true, requireApproval: true },
      },
    });
    await authorized();
    expect(mocks.runEditorialCron).toHaveBeenCalledWith(expect.objectContaining({
      route: "/api/cron/news",
      controls: { cronEnabled: true, dryRun: true, requireApproval: true },
    }));
  });

  it("dispatches on a panel-configured publication day", async () => {
    // 2026-09-09 is a Wednesday in Europe/Istanbul.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T05:00:00.000Z"));
    await authorized();

    const config = mocks.runEditorialCron.mock.calls[0][0];
    expect(config.sendDays).toEqual([1, 3, 5]);
    expect(config.dispatch).toBe(mocks.dispatchDueOneNewsIssues);
  });

  it("is a healthy no-op on a day the panel excludes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-09T05:00:00.000Z"));
    mocks.getRuntimeSettings.mockResolvedValue({ ...SETTINGS, oneNewsSendDays: "MON,FRI" });
    await authorized();

    const config = mocks.runEditorialCron.mock.calls[0][0];
    expect(config.sendDays).toEqual([1, 5]);
    expect(config.dispatch).not.toBe(mocks.dispatchDueOneNewsIssues);
    await expect(config.dispatch()).resolves.toEqual({
      issues: 0,
      recipients: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    });
    expect(mocks.dispatchDueOneNewsIssues).not.toHaveBeenCalled();
  });
});
