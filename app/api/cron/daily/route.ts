import { NextResponse } from "next/server";
import { runDailyPipeline, type SendArgs } from "@/lib/pipeline";
import { sendDailyEmail } from "@/lib/resend";
import {
  finishOperationalRun,
  oneArticleCronEnabled,
  oneArticleDryRunForced,
  startOperationalRun,
} from "@/lib/admin/one-article-ops";
import { isApprovalRequired } from "@/lib/admin/issues-config";
import { recordAudit } from "@/lib/admin/audit";
import { isSendDay, oneArticleSendDays } from "@/lib/schedule";

function oneArticleTimezone(): string {
  return process.env.ONE_ARTICLE_TIMEZONE?.trim() || "Europe/Istanbul";
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — generation + sending may take time

/**
 * GET/POST /api/cron/daily
 *
 * Runs the full editorial pipeline:
 *   1. Ingest candidates  →  Article rows
 *   2. Pick best per topic →  TopicDailyPick rows
 *   3. Match per subscriber → DailySend rows
 *   4. Generate / reuse summaries
 *   5. Send via Resend
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}`. This is what
 * Vercel Cron sends automatically when configured in `vercel.json`.
 *
 * Optional query params:
 *   ?dryRun=1   Render and queue, but skip the actual email send.
 *   ?date=YYYY-MM-DD   Run for a specific UTC date (default: today).
 */
async function handler(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1" || oneArticleDryRunForced();
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T00:00:00Z") : undefined;
  const requireApproval = isApprovalRequired();
  const run = await startOperationalRun({
    route: "/api/cron/daily",
    dryRun,
    requireApproval,
    metadata: { date: dateParam ?? null, cronEnabled: oneArticleCronEnabled() },
  });

  if (!oneArticleCronEnabled()) {
    await finishOperationalRun({
      id: run.id,
      status: "SKIPPED",
      error: "ONE_ARTICLE_CRON_ENABLED=false",
    });
    await recordAudit({
      actor: "cron",
      action: "oneArticle.cron.skipped",
      targetType: "OperationalRun",
      targetId: run.id,
      metadata: { reason: "cron_disabled" },
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "cron_disabled" });
  }

  if (!dateParam && !isSendDay(date ?? new Date(), oneArticleTimezone(), oneArticleSendDays())) {
    await finishOperationalRun({
      id: run.id,
      status: "SKIPPED",
      error: "not_scheduled_day",
    });
    await recordAudit({
      actor: "cron",
      action: "oneArticle.cron.skipped",
      targetType: "OperationalRun",
      targetId: run.id,
      metadata: { reason: "not_scheduled_day" },
    });
    return NextResponse.json({ ok: true, skipped: true, reason: "not_scheduled_day" });
  }

  try {
    const result = await runDailyPipeline({
      date,
      dryRun,
      requireApproval,
      send: dryRun ? undefined : (args: SendArgs) => sendDailyEmail(args),
    });
    await finishOperationalRun({
      id: run.id,
      status: "SUCCESS",
      generatedCount: result.picks,
      sentCount: result.sends.sent,
      skippedCount: result.sends.skipped,
      failedCount: result.sends.failed,
      metadata: result as never,
    });
    await recordAudit({
      actor: "cron",
      action: "oneArticle.cron.run",
      targetType: "OperationalRun",
      targetId: run.id,
      metadata: {
        date: result.date,
        dryRun,
        sent: result.sends.sent,
        skipped: result.sends.skipped,
        failed: result.sends.failed,
      },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/daily] failed:", err);
    const message = err instanceof Error ? err.message : "Pipeline failed";
    await finishOperationalRun({
      id: run.id,
      status: "FAILED",
      error: message,
    });
    await recordAudit({
      actor: "cron",
      action: "oneArticle.cron.failure",
      targetType: "OperationalRun",
      targetId: run.id,
      metadata: { error: message },
    });
    return NextResponse.json(
      { ok: false, error: "Pipeline failed" },
      { status: 500 },
    );
  }
}

export const GET = handler;
export const POST = handler;
