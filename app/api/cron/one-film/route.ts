import { NextResponse } from "next/server";
import { getControls } from "@/lib/admin/settings-store";
import {
  finishRun,
  notifyMissingScheduledEdition,
  notifyRunFailure,
  notifyZeroDelivery,
  startRun,
} from "@/lib/admin/operational-runs";
import { recordAudit } from "@/lib/admin/audit";
import { dispatchDueFilmEditorialIssues } from "@/lib/film/editorial";
import { getResendStatus } from "@/lib/resend";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
async function handler(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const controls = (await getControls()).film;
  const run = await startRun({
    productKey: "one-film", route: "/api/cron/one-film", dryRun: controls.dryRun,
    requireApproval: true, metadata: { mode: "manual-editorial-dispatch", cronEnabled: controls.cronEnabled },
  });
  if (!controls.cronEnabled) {
    await finishRun({ id: run.id, status: "SKIPPED", error: "cron_disabled" });
    return NextResponse.json({ ok: true, skipped: true, reason: "cron_disabled" });
  }
  if (controls.dryRun) {
    await finishRun({ id: run.id, status: "SKIPPED", error: "dry_run_enabled" });
    return NextResponse.json({ ok: true, skipped: true, reason: "dry_run_enabled" });
  }
  try {
    if (!getResendStatus().hasApiKey) throw new Error("RESEND_API_KEY is not configured");
    const result = await dispatchDueFilmEditorialIssues();
    await finishRun({
      id: run.id, status: "SUCCESS", generatedCount: 0, sentCount: result.sent,
      skippedCount: result.skipped, failedCount: result.failed, metadata: { ...result },
    });
    await recordAudit({
      actor: "cron", action: "oneFilm.editorial.dispatch", targetType: "OperationalRun",
      targetId: run.id, metadata: { ...result },
    });
    if (result.sent === 0) {
      await notifyZeroDelivery({
        productName: "OneFilm",
        route: "/api/cron/one-film",
        eligible: result.recipients,
      });
    }
    await notifyMissingScheduledEdition({
      productKey: "one-film",
      productName: "OneFilm",
      route: "/api/cron/one-film",
      issuesDispatched: result.issues,
      sendDays: [6],
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "editorial_dispatch_failed";
    await finishRun({ id: run.id, status: "FAILED", error: message });
    await notifyRunFailure({ productName: "OneFilm", route: "/api/cron/one-film", error: message });
    return NextResponse.json({ ok: false, error: "Editorial dispatch failed" }, { status: 500 });
  }
}
export const GET = handler;
export const POST = handler;
