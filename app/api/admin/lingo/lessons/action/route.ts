import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { generateLingoLesson } from "@/lib/lingo/generator";
import { renderLingoEmail } from "@/lib/lingo/email-template";
import { runOneLingoDailyPipeline } from "@/lib/lingo/pipeline";
import { sendDailyEmail } from "@/lib/resend";
import { parseEmail } from "@/lib/options";

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

  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const actor = adminActorLabel(req, body);
  const lesson = await prisma.lingoDailyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) {
    return NextResponse.json({ ok: false, error: "lesson_not_found" }, { status: 404 });
  }

  if (!adminFeatureFlags().sendActionsEnabled && ["send-test", "send-now"].includes(action)) {
    return NextResponse.json({ ok: false, error: "admin_send_actions_disabled" }, { status: 403 });
  }

  let result: Record<string, unknown> | undefined;

  switch (action) {
    case "approve":
      await prisma.lingoDailyLesson.update({
        where: { id: lesson.id },
        data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actor },
      });
      break;
    case "schedule": {
      const date = typeof body.date === "string" ? body.date : lesson.lessonDate.toISOString().slice(0, 10);
      await prisma.lingoDailyLesson.update({
        where: { id: lesson.id },
        data: {
          approvalStatus: "SCHEDULED",
          scheduledFor: new Date(`${date}T04:00:00Z`),
          approvedAt: new Date(),
          approvedBy: actor,
        },
      });
      break;
    }
    case "cancel":
      await prisma.lingoDailyLesson.update({
        where: { id: lesson.id },
        data: { approvalStatus: "CANCELED" },
      });
      break;
    case "needs-review":
      await prisma.lingoDailyLesson.update({
        where: { id: lesson.id },
        data: { approvalStatus: "NEEDS_REVIEW" },
      });
      break;
    case "regenerate": {
      const generated = await generateLingoLesson({
        targetLanguage: lesson.targetLanguage,
        nativeLanguage: lesson.nativeLanguage,
        level: lesson.level,
      });
      await prisma.lingoDailyLesson.update({
        where: { id: lesson.id },
        data: {
          title: generated.title,
          subject: generated.subject,
          previewText: generated.previewText,
          contentJson: generated.content as never,
          status: generated.generated ? "GENERATED" : "NOT_GENERATED",
          approvalStatus: "PENDING",
          generationProvider: generated.provider,
          generationModel: generated.model,
          generationMetadata: generated.metadata as never,
        },
      });
      break;
    }
    case "send-test": {
      const email = parseEmail(body.email);
      if (!email) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
      const rendered = renderLingoEmail(lesson, {
        date: lesson.lessonDate.toISOString().slice(0, 10),
        targetLanguage: lesson.targetLanguage,
        nativeLanguage: lesson.nativeLanguage,
        level: lesson.level,
        links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
      });
      const sent = await sendDailyEmail({ to: email, ...rendered });
      result = { messageId: sent.messageId ?? null };
      break;
    }
    case "send-now": {
      const pipelineResult = await runOneLingoDailyPipeline({
        date: lesson.lessonDate,
        segmentKey: lesson.segmentKey,
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
    action: `lingo.lesson.${action}`,
    targetType: "LingoDailyLesson",
    targetId: lesson.id,
    metadata: result ? (result as never) : undefined,
  });

  return NextResponse.json({ ok: true, result });
}
