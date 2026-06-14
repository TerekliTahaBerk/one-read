import { NextResponse } from "next/server";
import { runDailyPipeline, type SendArgs } from "@/lib/pipeline";
import { sendDailyEmail } from "@/lib/resend";

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
  const dryRun = url.searchParams.get("dryRun") === "1";
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(dateParam + "T00:00:00Z") : undefined;

  try {
    const result = await runDailyPipeline({
      date,
      dryRun,
      send: dryRun ? undefined : (args: SendArgs) => sendDailyEmail(args),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/daily] failed:", err);
    return NextResponse.json(
      { ok: false, error: "Pipeline failed" },
      { status: 500 },
    );
  }
}

export const GET = handler;
export const POST = handler;
