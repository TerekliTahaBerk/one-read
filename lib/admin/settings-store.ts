/**
 * Panel-editable runtime configuration.
 *
 * Each control resolves as: DB `Setting` row (if present) → else the original
 * environment variable → else a safe hard default. So an empty `Setting` table
 * reproduces the exact env-only behaviour the app shipped with, and the panel
 * can override any control without a redeploy.
 *
 * `getControls()` is request-cached (React `cache`) so a page render or a cron
 * invocation reads the table at most once.
 */

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/admin/audit";

export interface ProductControls {
  cronEnabled: boolean;
  dryRun: boolean;
  requireApproval: boolean;
}

export interface Controls {
  oneArticle: ProductControls;
  film: ProductControls;
  lingo: ProductControls;
}

export interface RuntimeSettings {
  controls: Controls;
  minArticleScore: number;
  minSummaryConfidence: number;
  minDeliveryScore: number;
  oneArticleSendDays: string;
  filmSendDays: string;
  lingoSendDays: string;
}

/** All keys the panel can write. Kept flat and explicit for a clean allow-list. */
export const SETTING_KEYS = {
  oneArticleCron: "oneArticle.cronEnabled",
  oneArticleDryRun: "oneArticle.dryRun",
  oneArticleApproval: "oneArticle.requireApproval",
  filmCron: "film.cronEnabled",
  filmDryRun: "film.dryRun",
  filmApproval: "film.requireApproval",
  lingoCron: "lingo.cronEnabled",
  lingoDryRun: "lingo.dryRun",
  lingoApproval: "lingo.requireApproval",
  minArticleScore: "quality.minArticleScore",
  minSummaryConfidence: "quality.minSummaryConfidence",
  minDeliveryScore: "quality.minDeliveryScore",
  oneArticleSendDays: "oneArticle.sendDays",
  filmSendDays: "film.sendDays",
  lingoSendDays: "lingo.sendDays",
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
    case SETTING_KEYS.filmCron:
      return process.env.ONEFILM_CRON_ENABLED === "true"; // default OFF
    case SETTING_KEYS.filmDryRun:
      return process.env.ONEFILM_DRY_RUN === "true"; // default OFF
    case SETTING_KEYS.filmApproval:
      return process.env.ONEFILM_REQUIRE_APPROVAL !== "false"; // default ON
    case SETTING_KEYS.lingoCron:
      return process.env.ONELINGO_CRON_ENABLED === "true"; // default OFF
    case SETTING_KEYS.lingoDryRun:
      return process.env.ONELINGO_DRY_RUN === "true"; // default OFF
    case SETTING_KEYS.lingoApproval:
      return process.env.ONELINGO_REQUIRE_APPROVAL !== "false"; // default ON
    default:
      return false;
  }
}

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
  SETTING_KEYS.filmSendDays,
  SETTING_KEYS.lingoSendDays,
]);
const VALID_DAYS = new Set(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);

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

function resolveDays(map: Map<string, string>, key: SettingKey, env: string | undefined, fallback: string): string {
  return normalizeDays(map.get(key) ?? "") ?? normalizeDays(env ?? "") ?? fallback;
}

/**
 * The effective control snapshot. DB-unreachable is tolerated: on any read
 * error we fall back to pure env defaults so a database blip never silently
 * flips sending behaviour.
 */
export const getControls = cache(async (): Promise<Controls> => {
  let map = new Map<string, string>();
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ALL_KEYS } } });
    map = new Map(rows.map((r) => [r.key, r.value]));
  } catch {
    map = new Map();
  }
  const K = SETTING_KEYS;
  return {
    oneArticle: {
      cronEnabled: resolveBool(map, K.oneArticleCron),
      dryRun: resolveBool(map, K.oneArticleDryRun),
      requireApproval: resolveBool(map, K.oneArticleApproval),
    },
    film: {
      cronEnabled: resolveBool(map, K.filmCron),
      dryRun: resolveBool(map, K.filmDryRun),
      requireApproval: resolveBool(map, K.filmApproval),
    },
    lingo: {
      cronEnabled: resolveBool(map, K.lingoCron),
      dryRun: resolveBool(map, K.lingoDryRun),
      requireApproval: resolveBool(map, K.lingoApproval),
    },
  };
});

/** Full, typed runtime configuration used by both the admin panel and cron. */
export const getRuntimeSettings = cache(async (): Promise<RuntimeSettings> => {
  let map = new Map<string, string>();
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ALL_KEYS } } });
    map = new Map(rows.map((r) => [r.key, r.value]));
  } catch { /* env fallbacks below */ }
  return {
    controls: await getControls(),
    minArticleScore: resolveNumber(map, SETTING_KEYS.minArticleScore),
    minSummaryConfidence: resolveNumber(map, SETTING_KEYS.minSummaryConfidence),
    minDeliveryScore: resolveNumber(map, SETTING_KEYS.minDeliveryScore),
    oneArticleSendDays: resolveDays(map, SETTING_KEYS.oneArticleSendDays, process.env.ONE_ARTICLE_SEND_DAYS, "MON,TUE,WED,THU,FRI"),
    filmSendDays: resolveDays(map, SETTING_KEYS.filmSendDays, process.env.ONE_FILM_SEND_DAYS, "SAT"),
    lingoSendDays: resolveDays(map, SETTING_KEYS.lingoSendDays, process.env.ONE_LINGO_SEND_DAYS, "MON,TUE,WED,THU,FRI"),
  };
});

/** Whether a setting has an explicit DB override (vs. falling back to env). */
export async function getOverriddenKeys(): Promise<Set<string>> {
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: ALL_KEYS } }, select: { key: true } });
    return new Set(rows.map((r) => r.key));
  } catch {
    return new Set();
  }
}

/** Upsert one setting. Boolean values are stored as "true"/"false". */
export async function setSetting(
  key: SettingKey,
  value: boolean | number | string,
  actor: string,
): Promise<void> {
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
}
