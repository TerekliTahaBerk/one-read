/**
 * Generic operational-run tracking, shared by every product's daily pipeline.
 *
 * A run row is opened before work starts (status RUNNING) and closed with the
 * outcome (SUCCESS / FAILED / SKIPPED) plus counts. This is what lets the panel
 * show a real "last run / last success / last error" per product instead of
 * guessing from the send log. On FAILED we also fire a best-effort admin alert
 * so an unattended backend still surfaces problems.
 *
 * Because every one of those records lives in the same database the pipeline
 * depends on, this module also owns the outage story: classifying transient
 * connection errors, retrying the safe-to-repeat writes, closing runs without
 * throwing, and reclaiming runs that a dead connection left open. The alert
 * channels that must survive the outage itself live in `@/lib/observability`.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendDailyEmail } from "@/lib/resend";

export interface StartRunInput {
  productKey: string;
  route: string;
  dryRun: boolean;
  requireApproval: boolean;
  metadata?: Prisma.InputJsonValue;
}

export async function startRun(input: StartRunInput) {
  return prisma.operationalRun.create({
    data: {
      productKey: input.productKey,
      route: input.route,
      dryRun: input.dryRun,
      requireApproval: input.requireApproval,
      metadata: input.metadata,
    },
  });
}

export interface FinishRunInput {
  id: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  generatedCount?: number;
  sentCount?: number;
  skippedCount?: number;
  failedCount?: number;
  error?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export async function finishRun(input: FinishRunInput) {
  return prisma.operationalRun.update({
    where: { id: input.id },
    data: {
      status: input.status,
      finishedAt: new Date(),
      generatedCount: input.generatedCount ?? 0,
      sentCount: input.sentCount ?? 0,
      skippedCount: input.skippedCount ?? 0,
      failedCount: input.failedCount ?? 0,
      error: input.error ?? null,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
  });
}

/**
 * `finishRun` for paths that must not be derailed by a second database failure.
 * If the database died mid-run, closing the row is impossible — the run stays
 * RUNNING and `reclaimStaleRuns()` picks it up later. Returns whether the write
 * landed so the caller can say so in its own (DB-independent) alert.
 */
export async function safeFinishRun(input: FinishRunInput): Promise<boolean> {
  try {
    await finishRun(input);
    return true;
  } catch (error) {
    console.error(
      "[operational-runs] could not close run",
      input.id,
      classifyRunFailure(error).message,
    );
    return false;
  }
}

/**
 * Prisma error codes worth retrying: the database is unreachable, slow, or
 * dropped the connection, rather than the query being wrong. Anything outside
 * this set (bad data, constraint violations, schema drift) will fail again on a
 * retry, so it is reported immediately instead.
 */
const TRANSIENT_DB_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server reached but timed out
  "P1008", // Operation timed out
  "P1017", // Server has closed the connection
  "P2024", // Timed out fetching a connection from the pool
  "P2034", // Transaction failed due to a write conflict or deadlock
]);

/**
 * A connection failure raised mid-query does *not* arrive as a coded error:
 * Prisma throws `PrismaClientInitializationError` with `code` and `errorCode`
 * both undefined, and puts the real cause in prose after a source code frame.
 * Recovering the code from the wording is what keeps `P1001` in the alert, the
 * run row and the 500 body instead of a useless "unknown".
 */
const TRANSIENT_SIGNATURES: Array<{ code: string; pattern: RegExp }> = [
  { code: "P1001", pattern: /can't reach database server/i },
  { code: "P1002", pattern: /database server .{0,40}timed out/i },
  { code: "P1008", pattern: /operations? timed out/i },
  { code: "P1017", pattern: /server has closed the connection/i },
  { code: "P2024", pattern: /timed out fetching a new connection from the (?:connection )?pool/i },
];

/** Socket-level failures that never carry a Prisma code of any kind. */
const TRANSIENT_MESSAGE =
  /(connection pool|closed the connection|connection (?:reset|refused|terminated|timed out)|econnrefused|econnreset|etimedout|eai_again|socket hang up)/i;

export interface RunFailureClassification {
  /** Prisma error code when present or recoverable, otherwise a stable slug. */
  code: string;
  /** True when a later invocation has a realistic chance of succeeding. */
  transient: boolean;
  message: string;
}

/**
 * Turns any thrown value into the shape both the run row and the out-of-band
 * alert record, so OneArticle and OneFilm report identical failure semantics.
 */
export function classifyRunFailure(error: unknown): RunFailureClassification {
  const raw = error as { code?: unknown; errorCode?: unknown } | null;
  const explicitCode =
    typeof raw?.code === "string"
      ? raw.code
      : typeof raw?.errorCode === "string"
        ? raw.errorCode
        : null;

  const text = condense(error instanceof Error ? error.message : String(error ?? ""));
  const signature = TRANSIENT_SIGNATURES.find((entry) => entry.pattern.test(text));
  // Start the message at the cause, so the 500-char cap never truncates it away
  // in favour of Prisma's invocation preamble.
  const message = signature ? text.slice(text.search(signature.pattern)) : text;

  return {
    code: explicitCode ?? signature?.code ?? "unknown",
    transient:
      (explicitCode !== null && TRANSIENT_DB_CODES.has(explicitCode)) ||
      signature !== undefined ||
      TRANSIENT_MESSAGE.test(text),
    message: (message.slice(0, 500) || "unknown_error").trim(),
  };
}

/** Drops Prisma's `Invalid \`x.y()\` invocation` header and its source frame. */
function condense(raw: string): string {
  return raw
    .split("\n")
    .filter((line) => !/^\s*(?:→\s*)?\d+\s/.test(line))
    .filter((line) => !/^\s*Invalid `.*` invocation/.test(line))
    .filter((line) => !/^\s*\/\S+:\d+:\d+\s*$/.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface DbRetryOptions {
  /** Total attempts, including the first. */
  attempts?: number;
  /** First backoff delay; each further wait triples it. */
  baseDelayMs?: number;
  onRetry?: (info: { attempt: number; delayMs: number; code: string }) => void;
}

export interface DbRetryOutcome<T> {
  result: T;
  attempts: number;
}

/**
 * Bounded retry for a single database operation.
 *
 * Only for steps that are safe to repeat — opening a run row, closing it. It is
 * deliberately never wrapped around editorial dispatch: duplicate-send safety
 * there comes from the per-recipient delivery rows and the provider idempotency
 * key, and re-entering the dispatcher from here would add a second claim path
 * for no benefit. The next scheduled invocation is the retry for real work.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: DbRetryOptions = {},
): Promise<DbRetryOutcome<T>> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 400;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return { result: await operation(), attempts: attempt };
    } catch (error) {
      lastError = error;
      const { transient, code } = classifyRunFailure(error);
      if (!transient || attempt === attempts) break;
      const delayMs = baseDelayMs * 3 ** (attempt - 1);
      options.onRetry?.({ attempt, delayMs, code });
      await sleep(delayMs);
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/**
 * Runs left RUNNING forever are the visible residue of a database outage: the
 * handler opened the row, then lost the connection (or the function was killed)
 * before it could close it. Without this, the panel reports "Running" for that
 * product indefinitely and no failure is ever recorded.
 *
 * The window matches the editorial dispatchers' own `SENDING` claim recovery, so
 * once the database returns, the stale run and its stuck edition are both
 * released on the same tick — and the edition is re-sent safely, because
 * per-recipient delivery rows already record what went out.
 */
export const STALE_RUN_TIMEOUT_MS = 15 * 60 * 1000;

export async function reclaimStaleRuns(
  productKey: string,
  now: Date = new Date(),
  staleAfterMs: number = STALE_RUN_TIMEOUT_MS,
): Promise<number> {
  try {
    const reclaimed = await prisma.operationalRun.updateMany({
      where: {
        productKey,
        status: "RUNNING",
        startedAt: { lt: new Date(now.getTime() - staleAfterMs) },
      },
      data: {
        status: "FAILED",
        finishedAt: now,
        error: "abandoned_run: no outcome recorded (database outage or worker loss)",
      },
    });
    return reclaimed.count;
  } catch {
    // The database is the thing being recovered from; a failure here just means
    // the next healthy invocation does the cleanup instead.
    return 0;
  }
}

export interface RunSnapshot {
  last: { startedAt: Date; status: string; error: string | null } | null;
  lastSuccessAt: Date | null;
  lastFailure: { startedAt: Date; error: string | null } | null;
}

/** Plain label for a raw run status. */
export function runStatusLabel(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "OK";
    case "FAILED":
      return "Failed";
    case "SKIPPED":
      return "Skipped";
    default:
      return "Running";
  }
}

/** Latest / latest-success / latest-failure runs for one product, in one call. */
export async function getRunSnapshot(productKey: string): Promise<RunSnapshot> {
  const [last, success, failed] = await Promise.all([
    prisma.operationalRun.findFirst({
      where: { productKey },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, status: true, error: true },
    }),
    prisma.operationalRun.findFirst({
      where: { productKey, status: "SUCCESS" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.operationalRun.findFirst({
      where: { productKey, status: "FAILED" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true, error: true },
    }),
  ]);
  return {
    last: last ?? null,
    lastSuccessAt: success?.startedAt ?? null,
    lastFailure: failed ?? null,
  };
}

/**
 * Best-effort admin alert when a run fails. No-op when ADMIN_EMAIL is unset or
 * email can't be sent; never throws (a failing alert must not mask the real
 * failure, nor break the cron response).
 */
export async function notifyRunFailure(input: {
  productName: string;
  route: string;
  error: string;
  /** Prisma code or slug, when the caller classified the cause. */
  code?: string;
  /** Set when the failure happened before any run row existed. */
  stage?: "start" | "dispatch" | "finish";
  runRecorded?: boolean;
}): Promise<void> {
  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return;
  const subject = `⚠️ ${input.productName} daily run failed`;
  const text = [
    `${input.productName} automatic run failed.`,
    ``,
    `Route: ${input.route}`,
    ...(input.stage ? [`Stage: ${input.stage}`] : []),
    ...(input.code && input.code !== "unknown" ? [`Code: ${input.code}`] : []),
    `Error: ${input.error}`,
    `Time: ${new Date().toISOString()}`,
    ...(input.runRecorded === false
      ? [
          ``,
          `No run row was written — the database was unreachable, so the admin`,
          `panel will not show this invocation. Check the Vercel runtime logs`,
          `and Sentry for event "cron_failure".`,
        ]
      : []),
    ``,
    `Open the admin panel to review and re-run.`,
  ].join("\n");
  try {
    await sendDailyEmail({ to, subject, text, html: `<pre>${escapeHtml(text)}</pre>` });
  } catch {
    // Swallow — alerting is best-effort.
  }
}

/** Alerts on a logically empty live run even when no exception was thrown. */
export async function notifyZeroDelivery(input: { productName: string; route: string; eligible: number }): Promise<void> {
  if (input.eligible <= 0) return;
  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return;
  const text = `${input.productName} completed with ${input.eligible} eligible subscriber(s), but delivered 0 emails.\n\nRoute: ${input.route}\nTime: ${new Date().toISOString()}\n\nReview approvals, generated content, provider errors, and send logs.`;
  try {
    await sendDailyEmail({ to, subject: `⚠️ ${input.productName}: zero deliveries`, text, html: `<pre>${escapeHtml(text)}</pre>` });
  } catch { /* best effort */ }
}

/**
 * Sends at most one alert per product/day when the expected editorial window
 * arrives without a due edition. A Setting row is the cross-instance
 * idempotency lock, so a ten-minute serverless cron cannot spam the operator.
 */
export async function notifyMissingScheduledEdition(input: {
  productKey: string;
  productName: string;
  route: string;
  issuesDispatched: number;
  sendDays: number[];
}): Promise<void> {
  if (input.issuesDispatched > 0) return;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value]),
  );
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const hour = Number(parts.hour);
  if (!input.sendDays.includes(weekday) || hour < 7 || hour > 9) return;

  const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
  try {
    await prisma.setting.create({
      data: {
        key: `alert.missing-edition.${input.productKey}.${dateKey}`,
        value: new Date().toISOString(),
        updatedBy: "cron",
      },
    });
  } catch {
    return;
  }

  const to = process.env.ADMIN_EMAIL?.trim();
  if (!to) return;
  const text = `${input.productName} has no due scheduled edition in its expected delivery window.\n\nDate: ${dateKey}\nRoute: ${input.route}\nTime: ${new Date().toISOString()}\n\nOpen the editorial panel, prepare the edition, and schedule it explicitly.`;
  try {
    await sendDailyEmail({
      to,
      subject: `⚠️ ${input.productName}: no edition scheduled`,
      text,
      html: `<pre>${escapeHtml(text)}</pre>`,
    });
  } catch {
    // Best effort; the idempotency row still records that the condition occurred.
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
