import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock("@/lib/admin/audit", () => ({ recordAudit: vi.fn() }));
vi.mock("@/lib/observability", () => ({ reportSettingsFallback: vi.fn() }));

import { prisma as prismaImport } from "@/lib/prisma";
import {
  describeSettings,
  readRuntimeSettings,
  SETTING_KEYS,
  setSetting,
} from "./settings-store";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

type StoredSetting = { key: string; value: string; updatedAt: Date; updatedBy: string | null };

function stored(rows: StoredSetting[]) {
  (prisma.setting.findMany as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue(rows as never);
}

const ENV_KEYS = [
  "ONE_ARTICLE_CRON_ENABLED",
  "ONE_ARTICLE_DRY_RUN",
  "ONE_ARTICLE_REQUIRE_APPROVAL",
  "ONENEWS_DELIVERY_ENABLED",
  "ONENEWS_DRY_RUN",
  "ONENEWS_REQUIRE_APPROVAL",
  "MIN_ARTICLE_SCORE",
  "MIN_DELIVERY_SCORE",
  "MIN_SUMMARY_CONFIDENCE",
  "ONE_ARTICLE_SEND_DAYS",
  "ONENEWS_SEND_DAYS",
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  mockReset(prisma);
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("readRuntimeSettings", () => {
  it("reproduces the original env-only behaviour when nothing is stored", async () => {
    stored([]);
    const settings = await readRuntimeSettings();

    expect(settings.degraded).toBe(false);
    expect(settings.controls.oneArticle).toEqual({
      cronEnabled: true,
      dryRun: false,
      requireApproval: true,
    });
    // OneNews stays off unless something explicitly turns it on.
    expect(settings.controls.oneNews.cronEnabled).toBe(false);
    expect(settings.minArticleScore).toBe(0.7);
    expect(settings.oneArticleSendDays).toBe("MON,TUE,WED,THU,FRI");
    expect(settings.oneNewsSendDays).toBe("MON,WED,FRI");
  });

  it("prefers a stored row over the environment", async () => {
    process.env.ONE_ARTICLE_SEND_DAYS = "MON,FRI";
    process.env.MIN_ARTICLE_SCORE = "0.9";
    stored([
      { key: SETTING_KEYS.oneArticleSendDays, value: "TUE,THU", updatedAt: new Date(), updatedBy: "a" },
      { key: SETTING_KEYS.minArticleScore, value: "0.55", updatedAt: new Date(), updatedBy: "a" },
      { key: SETTING_KEYS.oneNewsCron, value: "true", updatedAt: new Date(), updatedBy: "a" },
    ]);

    const settings = await readRuntimeSettings();
    expect(settings.oneArticleSendDays).toBe("TUE,THU");
    expect(settings.minArticleScore).toBe(0.55);
    expect(settings.controls.oneNews.cronEnabled).toBe(true);
  });

  it("falls back to the environment when a stored value is out of range", async () => {
    process.env.MIN_SUMMARY_CONFIDENCE = "80";
    stored([
      { key: SETTING_KEYS.minSummaryConfidence, value: "5000", updatedAt: new Date(), updatedBy: "a" },
      { key: SETTING_KEYS.oneArticleSendDays, value: "FUNDAY", updatedAt: new Date(), updatedBy: "a" },
    ]);

    const settings = await readRuntimeSettings();
    expect(settings.minSummaryConfidence).toBe(80);
    expect(settings.oneArticleSendDays).toBe("MON,TUE,WED,THU,FRI");
  });

  it("degrades to env defaults, flagged, when the settings table cannot be read", async () => {
    (prisma.setting.findMany as unknown as { mockRejectedValue: (v: unknown) => void })
      .mockRejectedValue(new Error("connection refused"));

    const settings = await readRuntimeSettings();
    expect(settings.degraded).toBe(true);
    expect(settings.controls.oneArticle.cronEnabled).toBe(true);
    expect(settings.controls.oneNews.cronEnabled).toBe(false);
  });
});

describe("describeSettings", () => {
  it("reports where each effective value came from", async () => {
    process.env.MIN_DELIVERY_SCORE = "0.4";
    const updatedAt = new Date("2026-09-01T10:00:00.000Z");
    stored([
      { key: SETTING_KEYS.oneArticleDryRun, value: "true", updatedAt, updatedBy: "editor@oneread" },
    ]);

    const { rows } = await describeSettings();
    const byKey = new Map(rows.map((row) => [row.key, row]));

    expect(byKey.get(SETTING_KEYS.oneArticleDryRun)).toMatchObject({
      value: "true",
      source: "panel",
      updatedBy: "editor@oneread",
      updatedAt,
    });
    expect(byKey.get(SETTING_KEYS.minDeliveryScore)).toMatchObject({
      value: "0.4",
      source: "environment",
    });
    expect(byKey.get(SETTING_KEYS.minArticleScore)).toMatchObject({
      value: "0.7",
      source: "default",
    });
  });

  it("does not claim a panel override for a stored value the resolver rejected", async () => {
    stored([
      { key: SETTING_KEYS.minArticleScore, value: "17", updatedAt: new Date(), updatedBy: "a" },
    ]);

    const { rows } = await describeSettings();
    const row = rows.find((r) => r.key === SETTING_KEYS.minArticleScore)!;
    expect(row.value).toBe("0.7");
    expect(row.source).toBe("default");
  });
});

describe("setSetting", () => {
  it("rejects a day list containing an unknown day", async () => {
    await expect(setSetting(SETTING_KEYS.oneNewsSendDays, "MON,BLURSDAY", "admin"))
      .rejects.toThrow("invalid_setting_value");
    expect(prisma.setting.upsert).not.toHaveBeenCalled();
  });

  it("rejects an empty day list rather than silently stopping delivery", async () => {
    await expect(setSetting(SETTING_KEYS.oneArticleSendDays, "", "admin"))
      .rejects.toThrow("invalid_setting_value");
  });

  it("normalizes and stores a valid day list", async () => {
    await setSetting(SETTING_KEYS.oneNewsSendDays, " mon , wed ,mon", "admin");
    expect(prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: SETTING_KEYS.oneNewsSendDays },
        create: expect.objectContaining({ value: "MON,WED" }),
      }),
    );
  });

  it("rejects a threshold outside its allowed range", async () => {
    await expect(setSetting(SETTING_KEYS.minArticleScore, 4, "admin"))
      .rejects.toThrow("invalid_setting_value");
  });
});
