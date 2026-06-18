/**
 * OneRead — admin endpoint: create a development preview pick.
 *
 * POST /api/admin/preview-pick
 * Auth: admin session cookie or ADMIN_TOKEN for internal callers.
 * Body: { articleId: string }
 *
 * Force-creates a TopicDailyPick for one article so the admin Email Preview
 * can render the full OneRead email for demo/manual content that may not
 * clear the production quality bar. Development/demo only — hard-disabled in
 * production. Never sends email.
 */

import { NextResponse } from "next/server";
import { createPreviewPick } from "@/lib/pipeline";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const denied = requireAdmin(req, body);
  if (denied) return denied;

  // Hard guard: never in production.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "preview picks are disabled in production" },
      { status: 403 },
    );
  }

  const articleId = typeof body.articleId === "string" ? body.articleId : "";
  if (!articleId) {
    return NextResponse.json({ error: "articleId is required" }, { status: 400 });
  }

  const { pick, reason } = await createPreviewPick(articleId, { demo: true });
  if (!pick) {
    return NextResponse.json(
      { error: reason ?? "could not create preview pick" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    pick: {
      id: pick.id,
      topic: pick.topic,
      sourceLanguage: pick.sourceLanguage,
      articleTitle: pick.articleTitle,
      status: pick.status,
    },
    note: "Preview pick created (dev/demo). Generate a summary, then open the admin Email Preview. No email is sent.",
  });
}
