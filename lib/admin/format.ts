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

/**
 * Display-only date helpers. Operations still reason in UTC / Europe-Istanbul
 * (see the scheduling math below); these are purely for human-facing copy and
 * never feed back into scheduling.
 */
const WHEN_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: SEND_TIMEZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Friendly local instant, e.g. "11 Jul, 07:00". No timezone noise. */
export function fmtWhen(d: Date | null | undefined): string {
  if (!d) return "—";
  return WHEN_FMT.format(d);
}

/** Relative time, e.g. "just now", "2 hours ago", "3 days ago". */
export function fmtAgo(d: Date | null | undefined, now = new Date()): string {
  if (!d) return "—";
  const diffMs = now.getTime() - d.getTime();
  const future = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);
  if (min < 1) return "just now";
  const suffix = (n: number, unit: string) =>
    future ? `in ${n} ${unit}${n === 1 ? "" : "s"}` : `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (min < 60) return suffix(min, "minute");
  const hr = Math.round(min / 60);
  if (hr < 24) return suffix(hr, "hour");
  const day = Math.round(hr / 24);
  if (day < 30) return suffix(day, "day");
  const mon = Math.round(day / 30);
  return suffix(mon, "month");
}

/** Calendar-relative day, e.g. "Today", "Tomorrow", "Sat, 11 Jul". */
export function fmtDay(d: Date | null | undefined, now = new Date()): string {
  if (!d) return "—";
  const dayMs = 24 * 60 * 60 * 1000;
  const startOf = (x: Date) =>
    Math.floor(
      new Date(x.toLocaleString("en-US", { timeZone: SEND_TIMEZONE })).getTime() / dayMs,
    );
  const delta = startOf(d) - startOf(now);
  if (delta === 0) return "Today";
  if (delta === 1) return "Tomorrow";
  if (delta === -1) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SEND_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
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
