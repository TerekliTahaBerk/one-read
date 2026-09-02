/**
 * The OneArticle editorial-cron handler body.
 *
 * Both products dispatch manually written editions on the same schedule and
 * must fail the same way, so the ordering below is the contract:
 *
 *  1. Authorize.
 *  2. Reclaim runs a previous outage left open (best-effort).
 *  3. Open the run row — retried, because this is the first database contact and
 *     a connection blip here used to bypass every alert.
 *  4. Honour the panel controls (cron disabled / dry run).
 *  5. Dispatch. Never retried in-process: duplicate-send safety belongs to the
 *     delivery rows and the provider idempotency key, and the schedule already
 *     provides the retry.
 *  6. Close the run, then run post-send notifications — isolated, so an alerting
 *     failure can never re-brand a successful send as a failed run.
 *
 * Any failure returns 500 with a machine-readable `code`/`stage`/`retryable`
 * body and fires the database-independent signal in `@/lib/observability`.
 */

import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/admin/audit";
import {
  classifyRunFailure,
  notifyMissingScheduledEdition,
  notifyRunFailure,
  notifyZeroDelivery,
  reclaimStaleRuns,
  safeFinishRun,
  startRun,
  withDbRetry,
  type DbRetryOptions,
} from "@/lib/admin/operational-runs";
import type { ProductControls } from "@/lib/admin/settings-store";
import { reportCronFailure } from "@/lib/observability";
import { getResendStatus } from "@/lib/resend";
import { emitCronHeartbeat } from "@/lib/cron-heartbeat";

export interface EditorialDispatchSummary {
  issues: number;
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface EditorialCronConfig {
  productKey: string;
  productName: string;
  route: string;
  /** Audit action recorded on a successful dispatch. */
  auditAction: string;
  /** Weekday numbers (0 = Sunday) the product is expected to publish on. */
  sendDays: number[];
  controls: ProductControls;
  /** True when the controls above came from env fallbacks, not the database. */
  controlsDegraded?: boolean;
  dispatch: () => Promise<EditorialDispatchSummary>;
  /** Overridable so tests do not sleep through the backoff. */
  retry?: DbRetryOptions;
}

/** Shared bearer-token gate for every cron route. */
export function authorizeCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export function unauthorizedCronResponse(): Response {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function runEditorialCron(config: EditorialCronConfig): Promise<Response> {
  const { controls } = config;
  let runId: string | null = null;
  // Tracked through the retry callback as well as the success value, so a
  // total failure still reports how hard we tried before giving up.
  let attempts = 1;
  const retry: DbRetryOptions = {
    ...config.retry,
    onRetry: (info) => {
      attempts = info.attempt + 1;
      config.retry?.onRetry?.(info);
    },
  };

  try {
    await reclaimStaleRuns(config.productKey);

    const started = await withDbRetry(
      () =>
        startRun({
          productKey: config.productKey,
          route: config.route,
          dryRun: controls.dryRun,
          requireApproval: controls.requireApproval,
          metadata: {
            mode: "manual-editorial-dispatch",
            cronEnabled: controls.cronEnabled,
            ...(config.controlsDegraded ? { controlsSource: "env-fallback" } : {}),
          },
        }),
      retry,
    );
    runId = started.result.id;
    attempts = started.attempts;

    if (!controls.cronEnabled) {
      await safeFinishRun({ id: runId, status: "SKIPPED", error: "cron_disabled" });
      return NextResponse.json({ ok: true, skipped: true, reason: "cron_disabled" });
    }
    if (controls.dryRun) {
      await safeFinishRun({ id: runId, status: "SKIPPED", error: "dry_run_enabled" });
      return NextResponse.json({ ok: true, skipped: true, reason: "dry_run_enabled" });
    }
    if (!getResendStatus().hasApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const result = await config.dispatch();

    const attentionRequired = result.failed > 0;
    const runRecorded = await safeFinishRun({
      id: runId,
      status: attentionRequired ? "FAILED" : "SUCCESS",
      generatedCount: 0,
      sentCount: result.sent,
      skippedCount: result.skipped,
      failedCount: result.failed,
      error: attentionRequired ? "partial_delivery_failure" : null,
      metadata: { ...result, attentionRequired },
    });

    // Past this point the emails are already out. Nothing here may throw into
    // the failure path, or a delivered edition would be recorded as failed and
    // an operator could re-run it by hand.
    await afterDispatch(config, result, runId, runRecorded);

    if (!attentionRequired && runRecorded) await emitCronHeartbeat();

    return NextResponse.json({
      ok: !attentionRequired,
      attentionRequired,
      outcome: attentionRequired ? "partial_failure" : "healthy",
      ...result,
    });
  } catch (error) {
    return failureResponse(config, error, runId, attempts);
  }
}

async function afterDispatch(
  config: EditorialCronConfig,
  result: EditorialDispatchSummary,
  runId: string,
  runRecorded: boolean,
): Promise<void> {
  try {
    await recordAudit({
      actor: "cron",
      action: config.auditAction,
      targetType: "OperationalRun",
      targetId: runId,
      metadata: { ...result, runRecorded },
    });
    if (result.sent === 0) {
      await notifyZeroDelivery({
        productName: config.productName,
        route: config.route,
        eligible: result.recipients,
      });
    }
    await notifyMissingScheduledEdition({
      productKey: config.productKey,
      productName: config.productName,
      route: config.route,
      issuesDispatched: result.issues,
      sendDays: config.sendDays,
    });
    if (result.failed > 0) {
      await reportCronFailure({
        productKey: config.productKey,
        productName: config.productName,
        route: config.route,
        stage: "finish",
        code: "partial_delivery_failure",
        transient: false,
        message: `${result.failed} recipient delivery record(s) require attention`,
        runId,
        error: new Error("partial_delivery_failure"),
      });
    }
  } catch (error) {
    await reportCronFailure({
      productKey: config.productKey,
      productName: config.productName,
      route: config.route,
      stage: "finish",
      ...classifyRunFailure(error),
      runId,
      error,
    });
  }
}

/**
 * A run that never opened (`stage: "start"`) is the case this whole module
 * exists for: no row, no panel entry, so the log line, the Sentry event and the
 * admin email are the only trace the invocation left behind.
 */
async function failureResponse(
  config: EditorialCronConfig,
  error: unknown,
  runId: string | null,
  attempts: number,
): Promise<Response> {
  const classification = classifyRunFailure(error);
  const stage = runId ? "dispatch" : "start";
  const runRecorded = runId
    ? await safeFinishRun({
        id: runId,
        status: "FAILED",
        error: `${classification.code}: ${classification.message}`,
      })
    : false;

  await reportCronFailure({
    productKey: config.productKey,
    productName: config.productName,
    route: config.route,
    stage,
    code: classification.code,
    transient: classification.transient,
    message: classification.message,
    runId,
    attempts,
    error,
  });
  await notifyRunFailure({
    productName: config.productName,
    route: config.route,
    error: classification.message,
    code: classification.code,
    stage,
    runRecorded,
  });

  return NextResponse.json(
    {
      ok: false,
      error: stage === "start" ? "Cron could not start" : "Editorial dispatch failed",
      code: classification.code,
      stage,
      retryable: classification.transient,
      runId,
      runRecorded,
    },
    { status: 500 },
  );
}
