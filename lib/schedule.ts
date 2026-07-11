/**
 * Send-day gating shared by the OneArticle (weekday) and OneFilm (Saturday)
 * crons. Computes the local day-of-week in a given IANA timezone so a UTC
 * cron trigger still respects "Monday morning in Istanbul", etc.
 */

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type DayCode = (typeof DAY_CODES)[number];

/** Local day-of-week code (e.g. "MON") for `date` in `timeZone`. */
export function localDayCode(date: Date, timeZone: string): DayCode {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" })
    .format(date)
    .toUpperCase();
  const code = DAY_CODES.find((d) => weekday.startsWith(d));
  return code ?? "SUN";
}

/** Parses a comma-separated day-code list (e.g. "MON,TUE,WED") from an env var. */
export function parseSendDays(raw: string | undefined, fallback: readonly DayCode[]): DayCode[] {
  if (!raw?.trim()) return [...fallback];
  const days = raw
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter((d): d is DayCode => (DAY_CODES as readonly string[]).includes(d));
  return days.length > 0 ? days : [...fallback];
}

/** True when `date`'s local day (in `timeZone`) is one of `sendDays`. */
export function isSendDay(date: Date, timeZone: string, sendDays: readonly DayCode[]): boolean {
  return sendDays.includes(localDayCode(date, timeZone));
}

export const ONE_ARTICLE_DEFAULT_SEND_DAYS: readonly DayCode[] = ["MON", "TUE", "WED", "THU", "FRI"];
export const ONE_FILM_DEFAULT_SEND_DAYS: readonly DayCode[] = ["SAT"];

export function oneArticleSendDays(override?: string): DayCode[] {
  return parseSendDays(override ?? process.env.ONE_ARTICLE_SEND_DAYS, ONE_ARTICLE_DEFAULT_SEND_DAYS);
}

export function oneFilmSendDays(override?: string): DayCode[] {
  return parseSendDays(override ?? process.env.ONE_FILM_SEND_DAYS, ONE_FILM_DEFAULT_SEND_DAYS);
}

export const ONE_LINGO_DEFAULT_SEND_DAYS: readonly DayCode[] = ["MON", "TUE", "WED", "THU", "FRI"];
export function oneLingoSendDays(override?: string): DayCode[] {
  return parseSendDays(override ?? process.env.ONE_LINGO_SEND_DAYS, ONE_LINGO_DEFAULT_SEND_DAYS);
}
