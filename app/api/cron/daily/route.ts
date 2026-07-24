import { NextResponse } from "next/server";
import { getControls } from "@/lib/admin/settings-store";
import { finishOperationalRun, startOperationalRun } from "@/lib/admin/one-article-ops";
import { notifyRunFailure } from "@/lib/admin/operational-runs";
import { recordAudit } from "@/lib/admin/audit";
import { dispatchDueEditorialIssues } from "@/lib/one-article/editorial";
import { getResendStatus } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * OneArticle editorial dispatcher. Content creation is deliberately absent:
 * the panel owns copy, readiness and scheduling; cron only sends due editions.
 */
async function handler(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const controls = (await getControls()).oneArticle;
  const run = await startOperationalRun({
    route: "/api/cron/daily",
    dryRun: false,
    requireApproval: true,
    metadata: { mode: "manual-editorial-dispatch", cronEnabled: controls.cronEnabled },
  });
  if (!controls.cronEnabled) {
    await finishOperationalRun({ id: run.id, status: "SKIPPED", error: "cron_disabled" });
    return NextResponse.json({ ok: true, skipped: true, reason: "cron_disabled" });
  }
  if (controls.dryRun) {
    await finishOperationalRun({ id: run.id, status: "SKIPPED", error: "dry_run_enabled" });
    return NextResponse.json({ ok: true, skipped: true, reason: "dry_run_enabled" });
  }

  try {
    if (!getResendStatus().hasApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    const result = await dispatchDueEditorialIssues();
    await finishOperationalRun({
      id: run.id,
      status: "SUCCESS",
      generatedCount: 0,
      sentCount: result.sent,
      skippedCount: result.skipped,
      failedCount: result.failed,
      metadata: { ...result },
    });
    await recordAudit({
      actor: "cron",
      action: "oneArticle.editorial.dispatch",
      targetType: "OperationalRun",
      targetId: run.id,
      metadata: { ...result },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "editorial_dispatch_failed";
    await finishOperationalRun({ id: run.id, status: "FAILED", error: message });
    await notifyRunFailure({
      productName: "OneArticle",
      route: "/api/cron/daily",
      error: message,
    });
    return NextResponse.json({ ok: false, error: "Editorial dispatch failed" }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
