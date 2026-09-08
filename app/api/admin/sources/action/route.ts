import { NextResponse } from "next/server";
import { adminActorLabel, adminFeatureFlags, requireAdminMutation } from "@/lib/admin/auth";
import { clearSourceError, setSourceActive } from "@/lib/admin/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sources/action — enable/disable one RSS feed, or clear its
 * stored fetch error. Auth = admin session cookie or ADMIN_TOKEN; gated by
 * ADMIN_MUTATIONS_ENABLED; every write is audited by the store.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const denied = await requireAdminMutation(request, body);
  if (denied) return denied;

  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  const actor = await adminActorLabel(request, body);

  try {
    if (body.action === "set-active") {
      if (typeof body.active !== "boolean") {
        return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
      }
      await setSourceActive(slug, body.active, actor);
      return NextResponse.json({ ok: true, result: { slug, active: body.active } });
    }
    if (body.action === "clear-error") {
      await clearSourceError(slug, actor);
      return NextResponse.json({ ok: true, result: { slug } });
    }
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "source_action_failed";
    const status = message === "source_not_found" ? 404 : message === "source_blocked_in_code" ? 409 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
