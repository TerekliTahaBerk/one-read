import { NextResponse } from "next/server";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/prisma";
import {
  cancelEditorialIssue,
  createEditorialIssue,
  duplicateEditorialIssue,
  scheduleEditorialIssue,
  retryEditorialIssue,
  setEditorialIssueReady,
  updateEditorialIssue,
  type EditorialIssueInput,
} from "@/lib/one-article/editorial";
import { renderEditorialEmail } from "@/lib/one-article/editorial-email";
import { getResendStatus, sendDailyEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
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
        issue = await createEditorialIssue(inputFrom(body), actor);
        break;
      case "update":
        issue = await updateEditorialIssue({
          id: issueId,
          version: Number(body.version),
          input: inputFrom(body),
          actor,
        });
        break;
      case "ready":
        issue = await setEditorialIssueReady(issueId, actor);
        break;
      case "schedule": {
        const scheduledFor = new Date(str(body.scheduledFor));
        issue = await scheduleEditorialIssue({ id: issueId, scheduledFor, actor });
        break;
      }
      case "cancel":
        issue = await cancelEditorialIssue(issueId, actor);
        break;
      case "retry":
        issue = await retryEditorialIssue(issueId, actor);
        break;
      case "duplicate":
        issue = await duplicateEditorialIssue(issueId, actor);
        break;
      case "test": {
        const to = str(body.to).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("invalid_email");
        if (!getResendStatus().hasApiKey) throw new Error("email_delivery_not_configured");
        issue = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id: issueId } });
        const base = (process.env.PUBLIC_BASE_URL || "https://oneread.app").replace(/\/$/, "");
        const rendered = renderEditorialEmail(issue, {
          unsubscribe: `${base}/unsubscribe?preview=1`,
        });
        const result = await sendDailyEmail({
          to,
          subject: `[Test] ${rendered.subject}`,
          text: rendered.text,
          html: rendered.html,
        });
        await recordAudit({
          actor,
          action: "oneArticle.editorial.test",
          targetType: "OneArticleIssue",
          targetId: issue.id,
          metadata: { to, messageId: result.messageId ?? null },
        });
        return NextResponse.json({ ok: true, issue, messageId: result.messageId });
      }
      default:
        return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
    }

    await recordAudit({
      actor,
      action: `oneArticle.editorial.${action}`,
      targetType: "OneArticleIssue",
      targetId: issue.id,
      metadata: { status: issue.status, language: issue.readingLanguage },
    });
    return NextResponse.json({ ok: true, issue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "editorial_action_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function inputFrom(body: Record<string, unknown>): EditorialIssueInput {
  return {
    readingLanguage: str(body.readingLanguage),
    subject: str(body.subject),
    previewText: str(body.previewText),
    headline: str(body.headline),
    bodyText: str(body.bodyText),
    sourceTitle: str(body.sourceTitle),
    sourceName: str(body.sourceName),
    sourceUrl: str(body.sourceUrl),
    ctaLabel: str(body.ctaLabel),
    adminNotes: str(body.adminNotes),
  };
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
