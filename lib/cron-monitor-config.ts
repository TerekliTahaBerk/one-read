export const CRON_MONITORS = {
  daily: {
    route: "/api/cron/daily",
    vercelSchedule: "*/10 * * * *",
    timezone: "UTC",
    localSemantics: "Poll every 10 minutes; due weekday is evaluated in the issue timezone (Europe/Istanbul by default)",
  },
  news: {
    route: "/api/cron/news",
    vercelSchedule: "0 16 * * *",
    timezone: "UTC",
    localSemantics: "Health poll daily at 19:00 Europe/Istanbul; delivery only Monday, Wednesday and Friday",
  },
} as const;

export function validateVercelCronConfig(config: { crons?: Array<{ path: string; schedule: string }> }): string[] {
  const actual = new Map((config.crons ?? []).map((cron) => [cron.path, cron.schedule]));
  return Object.values(CRON_MONITORS).flatMap((expected) =>
    actual.get(expected.route) === expected.vercelSchedule
      ? []
      : [`${expected.route} must use ${expected.vercelSchedule} (UTC)`],
  );
}
