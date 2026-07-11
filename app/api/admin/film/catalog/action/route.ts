import { NextResponse } from "next/server";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { addCatalogEntry } from "@/lib/film/catalog";

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
  const num = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  };
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : [];

  const title = str(body.title);
  if (!title) {
    return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  }
  const year = num(body.year);
  const runtimeMinutes = num(body.runtimeMinutes);
  const maxYear = new Date().getFullYear() + 2;
  if (year !== null && (year < 1888 || year > maxYear)) {
    return NextResponse.json({ ok: false, error: "invalid_year" }, { status: 400 });
  }
  if (runtimeMinutes !== null && (runtimeMinutes < 1 || runtimeMinutes > 600)) {
    return NextResponse.json({ ok: false, error: "invalid_runtime" }, { status: 400 });
  }
  const sourceUrl = str(body.sourceUrl);
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    return NextResponse.json({ ok: false, error: "invalid_source_url" }, { status: 400 });
  }

  const spoilerLevel = ["spoiler-free", "spoiler-light", "full"].includes(str(body.spoilerLevel))
    ? str(body.spoilerLevel)
    : "spoiler-light";

  const entry = await addCatalogEntry({
    title,
    year,
    director: str(body.director) || null,
    filmLanguage: str(body.filmLanguage) || null,
    runtimeMinutes,
    sourceUrl: sourceUrl || null,
    adminNote: str(body.adminNote) || null,
    genres: list(body.genres),
    moods: list(body.moods),
    spoilerLevel,
    createdBy: actor,
  });

  await recordAudit({
    actor,
    action: "film.catalog.create",
    targetType: "FilmCatalogEntry",
    targetId: entry.id,
  });

  return NextResponse.json({ ok: true, id: entry.id });
}
