/**
 * Database-independent error signalling.
 *
 * Every other alerting path in this app writes to (or reads from) Postgres:
 * operational runs, the audit log, the missing-edition idempotency lock. That is
 * exactly the wrong dependency during a database outage — the incident silences
 * its own alarm. The helpers here deliberately use only channels that keep
 * working when Prisma cannot connect: the platform's stdout log stream (Vercel
 * runtime logs) and Sentry.
 *
 * Everything is best-effort and never throws: a failing alarm must not mask, or
 * become, the failure it is reporting.
 */

import * as Sentry from "@sentry/nextjs";

export interface CronFailureSignal {
  productKey: string;
  productName: string;
  route: string;
  /** Where in the handler we died — `start` means we never reached the work. */
  stage: "start" | "dispatch" | "finish";
  /** Prisma error code (`P1001`, …) or a stable slug when there is none. */
  code: string;
  /** True when the cause looks like a retryable infrastructure blip. */
  transient: boolean;
  message: string;
  /** Null when the run row itself could not be created. */
  runId?: string | null;
  /** How many attempts the DB-bound step made before giving up. */
  attempts?: number;
  error?: unknown;
}

/**
 * Emits a cron failure on channels that survive a dead database.
 *
 * A `stage: "start"` signal is the important one: it means `startRun()` never
 * landed, so there is no `OperationalRun` row and the admin panel will show
 * nothing at all for this invocation. The log line and the Sentry event are the
 * only evidence that the cron fired.
 */
export async function reportCronFailure(signal: CronFailureSignal): Promise<void> {
  logStructured("cron_failure", {
    productKey: signal.productKey,
    route: signal.route,
    stage: signal.stage,
    code: signal.code,
    transient: signal.transient,
    runId: signal.runId ?? null,
    attempts: signal.attempts ?? 1,
    message: signal.message,
  });
  await captureToSentry(signal.error ?? new Error(signal.message), "error", {
    tags: {
      cron_product: signal.productKey,
      cron_route: signal.route,
      cron_stage: signal.stage,
      cron_error_code: signal.code,
      cron_transient: String(signal.transient),
    },
    extra: {
      runId: signal.runId ?? null,
      attempts: signal.attempts ?? 1,
      message: signal.message,
    },
  });
}

/**
 * Reports that runtime controls fell back to environment defaults because the
 * `Setting` table was unreadable. Not fatal — the fallback is intentional — but
 * it is the earliest observable symptom of a database outage during cron, and
 * it must not stay silent.
 */
export async function reportSettingsFallback(error: unknown): Promise<void> {
  logStructured("settings_read_degraded", {
    message: errorText(error),
  });
  await captureToSentry(error, "warning", {
    tags: { subsystem: "settings-store" },
    extra: { note: "Falling back to environment defaults for runtime controls." },
  });
}

/** One JSON line per event, so Vercel log search can filter on `event`. */
function logStructured(event: string, fields: Record<string, unknown>): void {
  try {
    console.error(
      JSON.stringify({
        level: "error",
        event,
        at: new Date().toISOString(),
        ...fields,
      }),
    );
  } catch {
    console.error(`[observability] ${event}`, fields);
  }
}

/**
 * Sends to Sentry and waits briefly for the transport. Serverless functions are
 * frozen the moment the response is returned, so an unflushed event is a lost
 * event — this is the whole reason the cron handler awaits its own alerting.
 */
async function captureToSentry(
  error: unknown,
  level: "error" | "warning",
  context: { tags: Record<string, string>; extra: Record<string, unknown> },
): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    Sentry.captureException(error instanceof Error ? error : new Error(errorText(error)), {
      level,
      tags: context.tags,
      extra: context.extra,
    });
    await Sentry.flush(2000);
  } catch {
    // Alerting is best-effort; never let it surface as a new failure.
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown_error";
}
