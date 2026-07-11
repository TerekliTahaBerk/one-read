import { NextResponse } from "next/server";
import { filmTimezone } from "@/lib/film/config";
import { getRuntimeSettings } from "@/lib/admin/settings-store";
import { startRun, finishRun, notifyRunFailure, notifyZeroDelivery } from "@/lib/admin/operational-runs";
import { ONE_FILM_PRODUCT_KEY } from "@/lib/options";
import { runOneFilmDailyPipeline, type SendArgs } from "@/lib/film/pipeline";
import { sendDailyEmail } from "@/lib/resend";
import { isSendDay, oneFilmSendDays } from "@/lib/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ROUTE = "/api/cron/one-film";

async function handler(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const runtimeSettings = await getRuntimeSettings();
  const controls = runtimeSettings.controls.film;
  const url = new URL(request.url);
  const dryRun = controls.dryRun || url.searchParams.get("dryRun") === "1";
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(`${dateParam}T00:00:00Z`) : undefined;
  const segmentKey = url.searchParams.get("segmentKey") || undefined;
  const skipGeneration = url.searchParams.get("skipGeneration") === "1";
  const sendNow = url.searchParams.get("sendNow") === "1";

  const run = await startRun({
    productKey: ONE_FILM_PRODUCT_KEY,
    route: ROUTE,
    dryRun,
    requireApproval: controls.requireApproval,
    metadata: { date: dateParam ?? null, cronEnabled: controls.cronEnabled },
  });

  if (!controls.cronEnabled) {
    await finishRun({ id: run.id, status: "SKIPPED", error: "cron_disabled" });
    return NextResponse.json({ ok: true, skipped: true, reason: "cron_disabled" });
  }

  if (!dateParam && !isSendDay(date ?? new Date(), filmTimezone(), oneFilmSendDays(runtimeSettings.filmSendDays))) {
    await finishRun({ id: run.id, status: "SKIPPED", error: "not_scheduled_day" });
    return NextResponse.json({ ok: true, skipped: true, reason: "not_scheduled_day" });
  }

  try {
    const result = await runOneFilmDailyPipeline({
      date,
      dryRun,
      segmentKey,
      skipGeneration,
      sendNow,
      requireApproval: controls.requireApproval,
      send: dryRun ? undefined : (args: SendArgs) => sendDailyEmail(args),
    });
    await finishRun({
      id: run.id,
      status: "SUCCESS",
      generatedCount: result.segments.generated,
      sentCount: result.sends.sent,
      skippedCount: result.sends.skipped,
      failedCount: result.sends.failed,
      metadata: result as never,
    });
    if (!dryRun && result.subscribers.eligible > 0 && result.sends.sent === 0) {
      await notifyZeroDelivery({ productName: "OneFilm", route: ROUTE, eligible: result.subscribers.eligible });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OneFilm pipeline failed";
    console.error("[cron/one-film] failed:", err);
    await finishRun({ id: run.id, status: "FAILED", error: message });
    await notifyRunFailure({ productName: "OneFilm", route: ROUTE, error: message });
    return NextResponse.json({ ok: false, error: "OneFilm pipeline failed" }, { status: 500 });
  }
}

export const GET = handler;
export const POST = handler;
