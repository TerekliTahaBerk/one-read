/**
 * OneRead — admin endpoint: dry-run the daily pipeline.
 *
 * POST /api/admin/dry-run
 * Auth: admin session cookie or "Authorization: Bearer ${ADMIN_TOKEN}".
 *
 * Runs the full pipeline (ingest → extract+score → pick → match →
 * summarize → render) but does NOT actually send any email. Returns
 * the full PipelineResult for inspection.
 */

import { NextResponse } from "next/server";
import { runDailyPipeline } from "@/lib/pipeline";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // up to 5 min on Vercel Pro

export async function POST(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  try {
    const result = await runDailyPipeline({ dryRun: true });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "pipeline failed" },
      { status: 500 },
    );
  }
}
