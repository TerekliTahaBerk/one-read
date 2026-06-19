import { NextResponse } from "next/server";
import { lingoCronEnabled, lingoDryRunForced, lingoRequireApproval } from "@/lib/lingo/config";
import { runOneLingoDailyPipeline, type SendArgs } from "@/lib/lingo/pipeline";
import { sendDailyEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handler(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!lingoCronEnabled()) {
    return NextResponse.json({ ok: false, error: "OneLingo cron disabled" }, { status: 403 });
  }

  const url = new URL(request.url);
  const dryRun = lingoDryRunForced() || url.searchParams.get("dryRun") === "1";
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(`${dateParam}T00:00:00Z`) : undefined;
  const segmentKey = url.searchParams.get("segmentKey") || undefined;
  const skipGeneration = url.searchParams.get("skipGeneration") === "1";
  const sendNow = url.searchParams.get("sendNow") === "1";

  try {
    const result = await runOneLingoDailyPipeline({
      date,
      dryRun,
      segmentKey,
      skipGeneration,
      sendNow,
      requireApproval: lingoRequireApproval(),
      send: dryRun ? undefined : (args: SendArgs) => sendDailyEmail(args),
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/one-lingo] failed:", err);
    return NextResponse.json(
      { ok: false, error: "OneLingo pipeline failed" },
      { status: 500 },
    );
  }
}

export const GET = handler;
export const POST = handler;
