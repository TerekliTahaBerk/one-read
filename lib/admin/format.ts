/**
 * Small, dependency-free formatting helpers shared across admin pages. Dates
 * are displayed in a stable, readable form; we never localize to the viewer's
 * timezone implicitly (operations reason in UTC / Europe-Istanbul explicitly).
 */

/** Daily send time, fixed by product decision. */
export const SEND_HOUR_LOCAL = 7;
export const SEND_TIMEZONE = "Europe/Istanbul";

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

export function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

/** Whole days from now until `d` (negative if past). null when no date. */
export function daysUntil(d: Date | null | undefined, now = new Date()): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function yesNo(v: boolean): string {
  return v ? "yes" : "—";
}

/**
 * Resolves the UTC instant for 07:00 Europe/Istanbul on a given calendar date.
 * Istanbul is UTC+3 year-round (no DST since 2016), so 07:00 local = 04:00 UTC.
 * This matches the existing Vercel cron schedule ("0 4 * * *").
 */
export const ISTANBUL_UTC_OFFSET_HOURS = 3;

export function sendInstantUtc(isoDate: string): Date {
  const hourUtc = SEND_HOUR_LOCAL - ISTANBUL_UTC_OFFSET_HOURS; // 7 - 3 = 4
  return new Date(`${isoDate}T${String(hourUtc).padStart(2, "0")}:00:00Z`);
}

export function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
