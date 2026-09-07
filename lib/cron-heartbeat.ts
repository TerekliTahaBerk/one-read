export type CronHeartbeatJob = "daily" | "news";

export interface CronHeartbeatResult {
  configured: boolean;
  delivered: boolean;
  reason?: "missing" | "invalid_url" | "provider_rejected" | "provider_unavailable";
}

const ENV_BY_JOB: Record<CronHeartbeatJob, string> = {
  daily: "BETTER_STACK_DAILY_CRON_HEARTBEAT_URL",
  news: "BETTER_STACK_NEWS_CRON_HEARTBEAT_URL",
};

/** Returns a secret-free validation result for launch checks and admin UI. */
export function validateCronHeartbeatUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return "missing";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return "invalid_url";
    return null;
  } catch {
    return "invalid_url";
  }
}

export function cronHeartbeatEnvironmentKey(job: CronHeartbeatJob): string {
  return ENV_BY_JOB[job];
}

/** Call only after the corresponding OperationalRun is durably SUCCESS. */
export async function emitCronHeartbeat(
  job: CronHeartbeatJob,
  request: typeof fetch = fetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CronHeartbeatResult> {
  const target = env[ENV_BY_JOB[job]]?.trim();
  const validation = validateCronHeartbeatUrl(target);
  if (validation) {
    return { configured: validation !== "missing", delivered: false, reason: validation as CronHeartbeatResult["reason"] };
  }
  try {
    const response = await request(target!, { method: "GET", cache: "no-store" });
    return response.ok
      ? { configured: true, delivered: true }
      : { configured: true, delivered: false, reason: "provider_rejected" };
  } catch {
    return { configured: true, delivered: false, reason: "provider_unavailable" };
  }
}
