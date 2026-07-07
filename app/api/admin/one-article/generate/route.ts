/**
 * OneRead — admin endpoint: generate an editable OneArticle draft with the AI.
 *
 * POST /api/admin/one-article/generate
 * Auth: admin session cookie or ADMIN_TOKEN.
 *
 * Body: { title, sourceText, topic, sourceLanguage?, summaryLanguage?,
 *         sourceName?, url? }
 *
 * Runs the production summary provider on the pasted source WITHOUT persisting
 * anything, and returns the fields the authoring form needs (subject, preview,
 * body). With GEMINI_API_KEY configured this is real model output; locally it
 * falls back to the dev heuristic. The admin edits the result, then saves it as
 * a DRAFT/READY issue via /api/admin/one-article/action (create-manual-issue).
 */

import { NextResponse } from "next/server";
import { requireAdmin, adminFeatureFlags } from "@/lib/admin/auth";
import { generateOneArticleDraft } from "@/lib/admin/one-article-ops";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const denied = requireAdmin(req, body);
  if (denied) return denied;
  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
  }

  try {
    const { result, aiStatus } = await generateOneArticleDraft({
      title: str(body.title),
      sourceText: str(body.sourceText),
      sourceName: str(body.sourceName) || null,
      url: str(body.url) || null,
      sourceLanguage: str(body.sourceLanguage) || "English",
      summaryLanguage: str(body.summaryLanguage) || "English",
      topic: str(body.topic),
      difficulty: str(body.difficulty) || "mixed",
    });

    const structured = result.structured;
    return NextResponse.json({
      ok: true,
      draft: {
        subject: structured?.subject ?? "",
        previewText: structured?.preheader ?? "",
        bodyText: result.bodyText,
        status: result.status,
        confidence: result.confidence ?? null,
        generator: result.generator ?? aiStatus.provider,
        rejectionReason: result.rejectionReason ?? null,
      },
      ai: {
        statusLabel: aiStatus.statusLabel,
        blocker: aiStatus.blocker,
        productionReady: aiStatus.productionReady,
        activeModel: aiStatus.activeModel,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "generate_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
