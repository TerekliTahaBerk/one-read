import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { generateNewsIssue } from "@/lib/news/generator";
import { renderNewsEmail } from "@/lib/news/email-template";
import { runOneNewsDailyPipeline } from "@/lib/news/pipeline";
import { loadNewsSourceStories } from "@/lib/news/sources";
import { sendDailyEmail } from "@/lib/resend";
import { parseEmail } from "@/lib/options";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const denied = requireAdmin(req, body);
  if (denied) return denied;

  const issueId = typeof body.issueId === "string" ? body.issueId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const actor = adminActorLabel(req, body);
  const issue = await prisma.newsDailyIssue.findUnique({ where: { id: issueId } });
  if (!issue) {
    return NextResponse.json({ ok: false, error: "issue_not_found" }, { status: 404 });
  }

  if (!adminFeatureFlags().sendActionsEnabled && ["send-test", "send-now"].includes(action)) {
    return NextResponse.json({ ok: false, error: "admin_send_actions_disabled" }, { status: 403 });
  }

  let result: Record<string, unknown> | undefined;

  switch (action) {
    case "approve":
      await prisma.newsDailyIssue.update({
        where: { id: issue.id },
        data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actor },
      });
      break;
    case "schedule": {
      const date = typeof body.date === "string" ? body.date : issue.issueDate.toISOString().slice(0, 10);
      await prisma.newsDailyIssue.update({
        where: { id: issue.id },
        data: {
          approvalStatus: "SCHEDULED",
          // 06:30 Europe/Istanbul = 03:30 UTC (Istanbul is UTC+3, no DST).
          scheduledFor: new Date(`${date}T03:30:00Z`),
          approvedAt: new Date(),
          approvedBy: actor,
        },
      });
      break;
    }
    case "cancel":
      await prisma.newsDailyIssue.update({ where: { id: issue.id }, data: { approvalStatus: "CANCELED" } });
      break;
    case "needs-review":
      await prisma.newsDailyIssue.update({ where: { id: issue.id }, data: { approvalStatus: "NEEDS_REVIEW" } });
      break;
    case "regenerate": {
      const stories = await loadNewsSourceStories({
        date: issue.issueDate,
        region: issue.regionFocus,
        language: issue.briefingLanguage,
        topics: issue.topics,
        limit: 10,
      });
      const generated = await generateNewsIssue(
        { briefingLanguage: issue.briefingLanguage, regionFocus: issue.regionFocus, topics: issue.topics },
        stories,
        { today: issue.issueDate.toISOString().slice(0, 10) },
      );
      const status = generated.generated
        ? "GENERATED"
        : generated.reason === "NO_SOURCES"
          ? "NO_SOURCES"
          : "NOT_GENERATED";
      await prisma.newsDailyIssue.update({
        where: { id: issue.id },
        data: {
          title: generated.title,
          subject: generated.subject,
          previewText: generated.previewText,
          contentJson: generated.content as unknown as Prisma.InputJsonObject,
          status,
          approvalStatus: "PENDING",
          generationProvider: generated.provider,
          generationModel: generated.model,
          generationMetadata: generated.metadata as Prisma.InputJsonObject,
        },
      });
      result = { status };
      break;
    }
    case "send-test": {
      const email = parseEmail(body.email);
      if (!email) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
      if (issue.status !== "GENERATED") {
        return NextResponse.json({ ok: false, error: "issue_not_generated" }, { status: 400 });
      }
      const rendered = renderNewsEmail(issue, {
        date: issue.issueDate.toISOString().slice(0, 10),
        briefingLanguage: issue.briefingLanguage,
        regionFocus: issue.regionFocus,
        links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
      });
      const sent = await sendDailyEmail({ to: email, ...rendered });
      result = { messageId: sent.messageId ?? null };
      break;
    }
    case "send-now": {
      const pipelineResult = await runOneNewsDailyPipeline({
        date: issue.issueDate,
        segmentKey: issue.segmentKey,
        sendNow: true,
        requireApproval: false,
      });
      result = pipelineResult.sends;
      break;
    }
    default:
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  await recordAudit({
    actor,
    action: `news.issue.${action}`,
    targetType: "NewsDailyIssue",
    targetId: issue.id,
    metadata: result ? (result as never) : undefined,
  });

  return NextResponse.json({ ok: true, result });
}
