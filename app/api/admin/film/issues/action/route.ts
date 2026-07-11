import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { generateFilmIssue } from "@/lib/film/generator";
import { renderFilmEmail } from "@/lib/film/email-template";
import { runOneFilmDailyPipeline } from "@/lib/film/pipeline";
import { pickFilmForSegment } from "@/lib/film/catalog";
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

  const issueId = typeof body.issueId === "string" ? body.issueId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const actor = adminActorLabel(req, body);

  // Bulk approve targets many notes for a date, so it carries no issueId.
  if (action === "approve-all") {
    const dateIso = typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
    const day = new Date(`${dateIso}T00:00:00Z`);
    const res = await prisma.filmDailyIssue.updateMany({
      where: { issueDate: day, status: "GENERATED", approvalStatus: { in: ["PENDING", "NEEDS_REVIEW"] } },
      data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actor },
    });
    await recordAudit({
      actor,
      action: "film.issue.approve-all",
      targetType: "FilmDailyIssue",
      targetId: dateIso,
      metadata: { approved: res.count } as never,
    });
    return NextResponse.json({ ok: true, result: { approved: res.count } });
  }

  const issue = await prisma.filmDailyIssue.findUnique({ where: { id: issueId } });
  if (!issue) {
    return NextResponse.json({ ok: false, error: "issue_not_found" }, { status: 404 });
  }

  if (!adminFeatureFlags().sendActionsEnabled && ["send-test", "send-now"].includes(action)) {
    return NextResponse.json({ ok: false, error: "admin_send_actions_disabled" }, { status: 403 });
  }

  let result: Record<string, unknown> | undefined;

  switch (action) {
    case "approve":
      await prisma.filmDailyIssue.update({
        where: { id: issue.id },
        data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actor },
      });
      break;
    case "schedule": {
      const date = typeof body.date === "string" ? body.date : issue.issueDate.toISOString().slice(0, 10);
      await prisma.filmDailyIssue.update({
        where: { id: issue.id },
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
      await prisma.filmDailyIssue.update({ where: { id: issue.id }, data: { approvalStatus: "CANCELED" } });
      break;
    case "needs-review":
      await prisma.filmDailyIssue.update({ where: { id: issue.id }, data: { approvalStatus: "NEEDS_REVIEW" } });
      break;
    case "regenerate": {
      const seg = {
        emailLanguage: issue.emailLanguage,
        genres: issue.genres,
        moods: issue.moods,
        spoilerPreference: "Spoiler-light",
      };
      const film = await pickFilmForSegment(seg);
      const generated = await generateFilmIssue(seg, film);
      const status = generated.generated
        ? "GENERATED"
        : generated.reason === "NO_FILM"
          ? "NO_FILM"
          : "NOT_GENERATED";
      await prisma.filmDailyIssue.update({
        where: { id: issue.id },
        data: {
          filmTitle: film?.title ?? null,
          filmYear: film?.year ?? null,
          director: film?.director ?? null,
          filmLanguage: film?.filmLanguage ?? null,
          runtimeMinutes: film?.runtimeMinutes ?? null,
          sourceUrl: film?.sourceUrl ?? null,
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
      const rendered = renderFilmEmail(issue, {
        date: issue.issueDate.toISOString().slice(0, 10),
        emailLanguage: issue.emailLanguage,
        links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" },
      });
      const sent = await sendDailyEmail({ to: email, ...rendered });
      result = { messageId: sent.messageId ?? null };
      break;
    }
    case "send-now": {
      const pipelineResult = await runOneFilmDailyPipeline({
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
    action: `film.issue.${action}`,
    targetType: "FilmDailyIssue",
    targetId: issue.id,
    metadata: result ? (result as never) : undefined,
  });

  return NextResponse.json({ ok: true, result });
}
