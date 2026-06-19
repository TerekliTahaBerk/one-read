import { NextResponse } from "next/server";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { addManualSourceStory } from "@/lib/news/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const action = typeof body.action === "string" ? body.action : "";
  const actor = adminActorLabel(req, body);

  if (action !== "create") {
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const headline = str(body.headline);
  const sourceName = str(body.sourceName);
  const sourceUrl = str(body.sourceUrl);
  if (!headline || !sourceName || !sourceUrl) {
    return NextResponse.json({ ok: false, error: "missing_required_fields" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(sourceUrl)) {
    return NextResponse.json({ ok: false, error: "invalid_source_url" }, { status: 400 });
  }

  const dateStr = str(body.storyDate) || new Date().toISOString().slice(0, 10);

  const story = await addManualSourceStory({
    headline,
    sourceName,
    sourceUrl,
    excerpt: str(body.excerpt) || null,
    topic: str(body.topic) || "World",
    region: str(body.region) || "Global",
    language: str(body.language) || "English",
    storyDate: new Date(`${dateStr}T00:00:00Z`),
    createdBy: actor,
  });

  await recordAudit({
    actor,
    action: "news.source.create",
    targetType: "NewsSourceStory",
    targetId: story.id,
  });

  return NextResponse.json({ ok: true, id: story.id });
}
