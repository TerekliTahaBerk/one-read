/**
 * Panel-editable runtime configuration.
 *
 * Each control resolves as: DB `Setting` row (if present) → else the original
 * environment variable → else a safe hard default. So an empty `Setting` table
 * reproduces the exact env-only behaviour the app shipped with, and the panel
 * can override any control without a redeploy.
 *
 * `getRuntimeSettings()` / `getControls()` are request-cached (React `cache`)
 * so a page render or a cron invocation reads the table at most once. Plain
 * Node contexts (scripts, the pipeline) must use `readRuntimeSettings()`, the
 * uncached variant, because React's request cache has no scope there.
 *
 * IMPORTANT: everything the panel can write must be *read back* by the code
 * that actually behaves differently — a control that is only persisted is a
 * lie to the operator. The consumers are:
 *   - controls        → `app/api/cron/{daily,news}/route.ts`
 *   - send days       → the same cron routes (weekday gate at dispatch)
 *   - quality bars    → `runDailyPipeline` in `lib/pipeline.ts`
 *   - requireApproval → `runDailyPipeline` ONLY. The editorial dispatchers do
 *     not consult it: an edition reaches SCHEDULED only through an editor, so
 *     for them the status is the approval. Label it accordingly in the panel.
 */

import * as React from "react";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/admin/audit";
import { reportSettingsFallback } from "@/lib/observability";
import { parseSendDays, type DayCode } from "@/lib/schedule";

export interface ProductControls {
  cronEnabled: boolean;
  dryRun: boolean;
  requireApproval: boolean;
}

export interface Controls {
  oneArticle: ProductControls;
  oneNews: ProductControls;
}

export interface RuntimeSettings {
  controls: Controls;
  minArticleScore: number;
  minSummaryConfidence: number;
  minDeliveryScore: number;
  oneArticleSendDays: string;
  oneNewsSendDays: string;
  /** True when the `Setting` read failed and env defaults were used instead. */
  degraded: boolean;
}

/** All keys the panel can write. Kept flat and explicit for a clean allow-list. */
export const SETTING_KEYS = {
  oneArticleCron: "oneArticle.cronEnabled",
  oneArticleDryRun: "oneArticle.dryRun",
  oneArticleApproval: "oneArticle.requireApproval",
  oneNewsCron: "oneNews.cronEnabled",
  oneNewsDryRun: "oneNews.dryRun",
  minArticleScore: "quality.minArticleScore",
  minSummaryConfidence: "quality.minSummaryConfidence",
  minDeliveryScore: "quality.minDeliveryScore",
  oneArticleSendDays: "oneArticle.sendDays",
  oneNewsSendDays: "oneNews.sendDays",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

const ALL_KEYS: SettingKey[] = Object.values(SETTING_KEYS);

export function isSettingKey(key: string): key is SettingKey {
  return (ALL_KEYS as string[]).includes(key);
}

/**
 * Env defaults — these mirror the original config helpers exactly, so removing a
 * DB row restores the historical behaviour of each toggle.
 */
function envBoolDefault(key: SettingKey): boolean {
  switch (key) {
    case SETTING_KEYS.oneArticleCron:
      return process.env.ONE_ARTICLE_CRON_ENABLED !== "false"; // default ON
    case SETTING_KEYS.oneArticleDryRun:
      return process.env.ONE_ARTICLE_DRY_RUN === "true"; // default OFF
    case SETTING_KEYS.oneArticleApproval:
      return process.env.ONE_ARTICLE_REQUIRE_APPROVAL !== "false"; // default ON
    case SETTING_KEYS.oneNewsCron:
      // Deployment alone can never activate the unreleased product.
      return process.env.ONENEWS_DELIVERY_ENABLED === "true"; // default OFF
    case SETTING_KEYS.oneNewsDryRun:
      return process.env.ONENEWS_DRY_RUN === "true"; // default OFF
    default:
      return false;
  }
}

/** The environment variable each key falls back to, for operator display. */
const ENV_VAR: Record<SettingKey, string> = {
  [SETTING_KEYS.oneArticleCron]: "ONE_ARTICLE_CRON_ENABLED",
  [SETTING_KEYS.oneArticleDryRun]: "ONE_ARTICLE_DRY_RUN",
  [SETTING_KEYS.oneArticleApproval]: "ONE_ARTICLE_REQUIRE_APPROVAL",
  [SETTING_KEYS.oneNewsCron]: "ONENEWS_DELIVERY_ENABLED",
  [SETTING_KEYS.oneNewsDryRun]: "ONENEWS_DRY_RUN",
  [SETTING_KEYS.minArticleScore]: "MIN_ARTICLE_SCORE",
  [SETTING_KEYS.minSummaryConfidence]: "MIN_SUMMARY_CONFIDENCE",
  [SETTING_KEYS.minDeliveryScore]: "MIN_DELIVERY_SCORE",
  [SETTING_KEYS.oneArticleSendDays]: "ONE_ARTICLE_SEND_DAYS",
  [SETTING_KEYS.oneNewsSendDays]: "ONENEWS_SEND_DAYS",
};

function resolveBool(map: Map<string, string>, key: SettingKey): boolean {
  const v = map.get(key);
  if (v === "true") return true;
  if (v === "false") return false;
  return envBoolDefault(key);
}

const NUMBER_RULES: Partial<Record<SettingKey, { min: number; max: number; fallback: () => number }>> = {
  [SETTING_KEYS.minArticleScore]: { min: 0, max: 1, fallback: () => Number(process.env.MIN_ARTICLE_SCORE ?? 0.7) },
  [SETTING_KEYS.minDeliveryScore]: { min: 0, max: 1, fallback: () => Number(process.env.MIN_DELIVERY_SCORE ?? 0.6) },
  [SETTING_KEYS.minSummaryConfidence]: { min: 0, max: 100, fallback: () => Number(process.env.MIN_SUMMARY_CONFIDENCE ?? 75) },
};

const DAY_RULES = new Set<SettingKey>([
  SETTING_KEYS.oneArticleSendDays,
  SETTING_KEYS.oneNewsSendDays,
]);
const VALID_DAYS = new Set(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

export const DEFAULT_ONE_ARTICLE_SEND_DAYS = "MON,TUE,WED,THU,FRI";
export const DEFAULT_ONE_NEWS_SEND_DAYS = "MON,WED,FRI";

function resolveNumber(map: Map<string, string>, key: SettingKey): number {
  const rule = NUMBER_RULES[key]!;
  const parsed = Number(map.get(key));
  const fallback = rule.fallback();
  return Number.isFinite(parsed) && parsed >= rule.min && parsed <= rule.max
    ? parsed
    : Number.isFinite(fallback) ? fallback : rule.min;
}

function normalizeDays(value: string): string | null {
  const days = Array.from(new Set(value.split(",").map((d) => d.trim().toUpperCase()).filter(Boolean)));
  return days.length > 0 && days.every((d) => VALID_DAYS.has(d)) ? days.join(",") : null;
}

function resolveDays(map: Map<string, string>, key: SettingKey, fallback: string): string {
  return normalizeDays(map.get(key) ?? "") ?? normalizeDays(process.env[ENV_VAR[key]] ?? "") ?? fallback;
}

export interface ControlsSnapshot {
  controls: Controls;
  /** True when the `Setting` read failed and env defaults were used instead. */
  degraded: boolean;
}

/**
 * Read the `Setting` allow-list once. DB-unreachable is tolerated: on any read
 * error we fall back to pure env defaults so a database blip never silently
 * flips sending behaviour. The fallback is reported out-of-band — silently
 * serving env defaults would hide the first symptom of a database outage.
 */
async function readSettingRows(): Promise<{ map: Map<string, string>; degraded: boolean }> {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ALL_KEYS } } });
    return { map: new Map(rows.map((r) => [r.key, r.value])), degraded: false };
  } catch (error) {
    // Awaited, not fire-and-forget: on a serverless runtime the function is
    // frozen at response time and an unflushed Sentry event is a lost one.
    await reportSettingsFallback(error);
    return { map: new Map(), degraded: true };
  }
}

function buildRuntimeSettings(map: Map<string, string>, degraded: boolean): RuntimeSettings {
  const K = SETTING_KEYS;
  return {
    degraded,
    controls: {
      oneArticle: {
        cronEnabled: resolveBool(map, K.oneArticleCron),
        dryRun: resolveBool(map, K.oneArticleDryRun),
        requireApproval: resolveBool(map, K.oneArticleApproval),
      },
      oneNews: {
        cronEnabled: resolveBool(map, K.oneNewsCron),
        dryRun: resolveBool(map, K.oneNewsDryRun),
        // Not panel-editable, and not a policy flag: `dispatchDueOneNewsIssues`
        // only ever claims an issue an editor has marked ready and scheduled,
        // so the state machine *is* the approval. A toggle here would have had
        // nothing to switch off.
        requireApproval: true,
      },
    },
    minArticleScore: resolveNumber(map, K.minArticleScore),
    minSummaryConfidence: resolveNumber(map, K.minSummaryConfidence),
    minDeliveryScore: resolveNumber(map, K.minDeliveryScore),
    oneArticleSendDays: resolveDays(map, K.oneArticleSendDays, DEFAULT_ONE_ARTICLE_SEND_DAYS),
    oneNewsSendDays: resolveDays(map, K.oneNewsSendDays, DEFAULT_ONE_NEWS_SEND_DAYS),
  };
}

/**
 * Uncached read of the full runtime configuration. Use this outside a request
 * (scripts, the pipeline); server components and route handlers should prefer
 * `getRuntimeSettings()`.
 */
export async function readRuntimeSettings(): Promise<RuntimeSettings> {
  const { map, degraded } = await readSettingRows();
  return buildRuntimeSettings(map, degraded);
}

/**
 * React's request cache, or a pass-through where it does not exist.
 *
 * `cache` is only available in the React build Next.js aliases in for server
 * rendering. This module is also imported by the pipeline and by plain Node
 * scripts, where calling it at module scope would throw at import time — long
 * before anything gets a chance to handle the failure.
 */
function requestCache<T extends (...args: never[]) => unknown>(fn: T): T {
  const reactCache = (React as { cache?: <F>(fn: F) => F }).cache;
  return typeof reactCache === "function" ? reactCache(fn) : fn;
}

/** Full, typed runtime configuration used by both the admin panel and cron. */
export const getRuntimeSettings = requestCache(readRuntimeSettings);

export const readControls = requestCache(async (): Promise<ControlsSnapshot> => {
  const settings = await getRuntimeSettings();
  return { controls: settings.controls, degraded: settings.degraded };
});

export async function getControls(): Promise<Controls> {
  return (await readControls()).controls;
}

/** Panel-resolved send days as `DayCode`s, ready for `isSendDay`. */
export function sendDayCodes(value: string, fallback: readonly DayCode[]): DayCode[] {
  return parseSendDays(value, fallback);
}

export type SettingSource = "panel" | "environment" | "default";

export interface EffectiveSetting {
  key: SettingKey;
  /** The value the system actually uses right now. */
  value: string;
  source: SettingSource;
  /** The environment variable consulted when there is no panel override. */
  envVar: string;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/**
 * Every panel-editable control with its effective value and where that value
 * came from. This is what makes the Settings screen answerable to the only
 * question that matters during an incident: "is what I see what is running?"
 */
export async function describeSettings(): Promise<{
  settings: RuntimeSettings;
  rows: EffectiveSetting[];
  degraded: boolean;
}> {
  let stored: { key: string; value: string; updatedAt: Date; updatedBy: string | null }[] = [];
  let degraded = false;
  try {
    stored = await prisma.setting.findMany({
      where: { key: { in: ALL_KEYS } },
      select: { key: true, value: true, updatedAt: true, updatedBy: true },
    });
  } catch (error) {
    degraded = true;
    await reportSettingsFallback(error);
  }
  const byKey = new Map(stored.map((r) => [r.key, r]));
  const settings = buildRuntimeSettings(
    new Map(stored.map((r) => [r.key, r.value])),
    degraded,
  );
  const effective: Record<SettingKey, string> = {
    [SETTING_KEYS.oneArticleCron]: String(settings.controls.oneArticle.cronEnabled),
    [SETTING_KEYS.oneArticleDryRun]: String(settings.controls.oneArticle.dryRun),
    [SETTING_KEYS.oneArticleApproval]: String(settings.controls.oneArticle.requireApproval),
    [SETTING_KEYS.oneNewsCron]: String(settings.controls.oneNews.cronEnabled),
    [SETTING_KEYS.oneNewsDryRun]: String(settings.controls.oneNews.dryRun),
    [SETTING_KEYS.minArticleScore]: String(settings.minArticleScore),
    [SETTING_KEYS.minSummaryConfidence]: String(settings.minSummaryConfidence),
    [SETTING_KEYS.minDeliveryScore]: String(settings.minDeliveryScore),
    [SETTING_KEYS.oneArticleSendDays]: settings.oneArticleSendDays,
    [SETTING_KEYS.oneNewsSendDays]: settings.oneNewsSendDays,
  };

  const rows = ALL_KEYS.map((key): EffectiveSetting => {
    const row = byKey.get(key);
    // A stored row that fails validation is *not* the effective value, so it
    // must not be reported as a panel override — that would be the same lie
    // this whole module exists to remove.
    const overridden = Boolean(row && row.value === effective[key]);
    const envSet = process.env[ENV_VAR[key]] !== undefined && process.env[ENV_VAR[key]] !== "";
    return {
      key,
      value: effective[key],
      source: overridden ? "panel" : envSet ? "environment" : "default",
      envVar: ENV_VAR[key],
      updatedAt: overridden ? (row?.updatedAt ?? null) : null,
      updatedBy: overridden ? (row?.updatedBy ?? null) : null,
    };
  });

  return { settings, rows, degraded };
}

/**
 * Upsert one setting. Boolean values are stored as "true"/"false".
 * Returns the value as *stored* — normalised and validated — so a caller can
 * report back what actually took effect rather than what was submitted.
 */
export async function setSetting(
  key: SettingKey,
  value: boolean | number | string,
  actor: string,
): Promise<string> {
  let stringValue: string;
  if (NUMBER_RULES[key]) {
    const n = typeof value === "number" ? value : Number(value);
    const rule = NUMBER_RULES[key]!;
    if (!Number.isFinite(n) || n < rule.min || n > rule.max) throw new Error("invalid_setting_value");
    stringValue = String(n);
  } else if (DAY_RULES.has(key)) {
    const normalized = typeof value === "string" ? normalizeDays(value) : null;
    if (!normalized) throw new Error("invalid_setting_value");
    stringValue = normalized;
  } else {
    if (typeof value !== "boolean") throw new Error("invalid_setting_value");
    stringValue = value ? "true" : "false";
  }
  await prisma.setting.upsert({
    where: { key },
    update: { value: stringValue, updatedBy: actor },
    create: { key, value: stringValue, updatedBy: actor },
  });
  await recordAudit({
    actor,
    action: "settings.update",
    targetType: "Setting",
    targetId: key,
    metadata: { value: stringValue },
  });
  return stringValue;
}
