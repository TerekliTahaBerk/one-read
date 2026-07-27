import { NextResponse } from "next/server";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import {
  cancelFilmEditorialIssue,
  createFilmEditorialIssue,
  duplicateFilmEditorialIssue,
  retryFilmEditorialIssue,
  scheduleFilmEditorialIssue,
  setFilmEditorialIssueReady,
  updateFilmEditorialIssue,
  type FilmEditorialIssueInput,
} from "@/lib/film/editorial";
import { renderFilmEditorialEmail } from "@/lib/film/editorial-email";
import { validateFilmEditorialTest } from "@/lib/film/editorial-validation";
import { getResendStatus, sendDailyEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 }); }
  const denied = requireAdmin(request, body);
  if (denied) return denied;
  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
  }
  const action = str(body.action);
  const actor = adminActorLabel(request, body);
  const issueId = str(body.issueId);
  try {
    let issue;
    switch (action) {
      case "create":
        issue = await createFilmEditorialIssue(inputFrom(body), actor);
        break;
      case "update":
        issue = await updateFilmEditorialIssue({ id: issueId, version: Number(body.version), input: inputFrom(body), actor });
        break;
      case "ready":
        issue = await setFilmEditorialIssueReady(issueId, actor);
        break;
      case "schedule":
        issue = await scheduleFilmEditorialIssue({ id: issueId, scheduledFor: new Date(str(body.scheduledFor)), actor });
        break;
      case "cancel":
        issue = await cancelFilmEditorialIssue(issueId, actor);
        break;
      case "retry":
        issue = await retryFilmEditorialIssue(issueId, actor);
        break;
      case "duplicate":
        issue = await duplicateFilmEditorialIssue(issueId, actor);
        break;
      case "test": {
        const to = str(body.to).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("invalid_email");
        if (!getResendStatus().hasApiKey) throw new Error("email_delivery_not_configured");
        issue = await prisma.oneFilmIssue.findUniqueOrThrow({ where: { id: issueId } });
        const validation = validateFilmEditorialTest(issue);
        if (!validation.ok) throw new Error(validation.error);
        const base = (process.env.PUBLIC_BASE_URL || "https://oneread.email").replace(/\/$/, "");
        const rendered = renderFilmEditorialEmail(issue, { unsubscribe: `${base}/unsubscribe?preview=1` });
        const result = await sendDailyEmail({
          to, subject: `[Test] ${rendered.subject}`, text: rendered.text, html: rendered.html,
        });
        await recordAudit({
          actor, action: "oneFilm.editorial.test", targetType: "OneFilmIssue", targetId: issue.id,
          metadata: { to, messageId: result.messageId ?? null },
        });
        return NextResponse.json({ ok: true, issue, messageId: result.messageId });
      }
      default:
        return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
    }
    await recordAudit({
      actor, action: `oneFilm.editorial.${action}`, targetType: "OneFilmIssue", targetId: issue.id,
      metadata: { status: issue.status, language: issue.emailLanguage },
    });
    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "editorial_action_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function inputFrom(body: Record<string, unknown>): FilmEditorialIssueInput {
  return {
    emailLanguage: str(body.emailLanguage), subject: str(body.subject), previewText: str(body.previewText),
    filmTitle: str(body.filmTitle), bodyText: str(body.bodyText), heroImageUrl: str(body.heroImageUrl),
    heroImageAlt: str(body.heroImageAlt), heroImageCredit: str(body.heroImageCredit),
    filmYear: nullableNumber(body.filmYear), director: str(body.director), filmLanguage: str(body.filmLanguage),
    runtimeMinutes: nullableNumber(body.runtimeMinutes), sourceName: str(body.sourceName),
    sourceUrl: str(body.sourceUrl), ctaLabel: str(body.ctaLabel), adminNotes: str(body.adminNotes),
  };
}
function str(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function nullableNumber(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : Number.NaN;
}
