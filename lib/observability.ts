/** Database-independent, PII-safe structured runtime observability. */
import * as Sentry from "@sentry/nextjs";
import { createHash } from "node:crypto";
import { scrubTelemetry } from "@/lib/sentry-privacy";

export const OBSERVABILITY_SUBSYSTEMS = ["billing", "verification", "polar_webhook", "resend_webhook", "cron", "delivery", "reconciliation"] as const;
export type ObservabilitySubsystem = (typeof OBSERVABILITY_SUBSYSTEMS)[number];
export type RetryClassification = "not_retryable" | "retryable" | "provider_retry" | "reconciliation_required";
export type OperationalSeverity = "CRITICAL" | "ERROR" | "WARNING" | "INFO";

export interface OperationalContext {
  subsystem: ObservabilitySubsystem;
  operation: string;
  outcome: string;
  productKey?: string | null;
  state?: string | null;
  correlationId?: string | null;
  retryClassification?: RetryClassification;
  errorCode?: string | null;
  runId?: string | null;
  attempts?: number;
  severity?: OperationalSeverity;
  alertable?: boolean;
  action?: string | null;
  fingerprint?: string[];
  metadata?: Record<string, unknown>;
}

/** Hash identifiers before telemetry unless their provider contract explicitly declares them public. */
export function telemetryId(value: string | null | undefined): string | null {
  if (!value) return null;
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function reportOperationalEvent(event: string, context: OperationalContext, options: { error?: unknown; level?: "info" | "warning" | "error"; flush?: boolean } = {}): Promise<void> {
  const level = options.level ?? (options.error ? "error" : "info");
  const canonical = scrubTelemetry({
    subsystem: context.subsystem,
    product_key: context.productKey ?? null,
    operation: context.operation,
    outcome: context.outcome,
    state: context.state ?? null,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    release_sha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
    correlation_id: telemetryId(context.correlationId),
    retry_classification: context.retryClassification ?? "not_retryable",
    error_code: context.errorCode ?? null,
    run_id: telemetryId(context.runId),
    attempts: context.attempts,
    severity: context.severity ?? (level === "error" ? "ERROR" : level === "warning" ? "WARNING" : "INFO"),
    alertable: context.alertable ?? level === "error",
    action: context.action ?? null,
    ...context.metadata,
  }) as Record<string, unknown>;

  logStructured(level, event, canonical);
  if (!process.env.SENTRY_DSN) return;
  try {
    const tags = Object.fromEntries(Object.entries(canonical)
      .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      .map(([key, value]) => [key, String(value)]));
    // A stable provider/operation/failure fingerprint groups repeated outage
    // occurrences into one incident without dropping any occurrence.
    const captureContext = {
      level,
      tags,
      extra: canonical,
      ...(context.fingerprint ? { fingerprint: context.fingerprint } : {}),
    };
    if (options.error !== undefined) Sentry.captureException(options.error instanceof Error ? options.error : new Error(safeErrorText(options.error)), captureContext);
    else Sentry.captureMessage(event, captureContext);
    if (options.flush) await Sentry.flush(2000);
  } catch {
    // Telemetry is best-effort and must never replace the original outcome.
  }
}

export interface CronFailureSignal {
  productKey: string;
  productName: string;
  route: string;
  stage: "start" | "dispatch" | "finish";
  code: string;
  transient: boolean;
  message: string;
  runId?: string | null;
  attempts?: number;
  error?: unknown;
}

export async function reportCronFailure(signal: CronFailureSignal): Promise<void> {
  await reportOperationalEvent("cron_failure", {
    subsystem: "cron", productKey: signal.productKey, operation: "editorial_dispatch", outcome: "failed", state: signal.stage,
    correlationId: signal.runId, runId: signal.runId, retryClassification: signal.transient ? "retryable" : "not_retryable",
    errorCode: signal.code, attempts: signal.attempts ?? 1, metadata: { route: signal.route, message: safeErrorText(signal.message) },
  }, { error: signal.error ?? new Error(signal.message), level: "error", flush: true });
}

export async function reportSettingsFallback(error: unknown): Promise<void> {
  await reportOperationalEvent("settings_read_degraded", {
    subsystem: "cron", operation: "read_runtime_controls", outcome: "degraded", state: "env_fallback",
    retryClassification: "retryable", metadata: { message: safeErrorText(error) },
  }, { error, level: "warning", flush: true });
}

function logStructured(level: "info" | "warning" | "error", event: string, fields: Record<string, unknown>): void {
  try {
    const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...fields });
    if (level === "error") console.error(line); else if (level === "warning") console.warn(line); else console.info(line);
  } catch { console.error(`[observability] ${event}`); }
}

function safeErrorText(error: unknown): string {
  const text = error instanceof Error ? error.message : typeof error === "string" ? error : "unknown_error";
  return String(scrubTelemetry(text)).slice(0, 500);
}
