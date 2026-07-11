import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { generateFilmIssue } from "@/lib/film/generator";
import { renderFilmEmail } from "@/lib/film/email-template";
import { runOneFilmDailyPipeline, type SendArgs } from "@/lib/film/pipeline";
import { pickFilmForSegment } from "@/lib/film/catalog";
import { sendDailyEmail } from "@/lib/resend";
import { parseEmail, ONE_FILM_PRODUCT_KEY } from "@/lib/options";
import { getControls } from "@/lib/admin/settings-store";
import { startRun, finishRun, notifyRunFailure } from "@/lib/admin/operational-runs";
import { runSharedGates, toReport } from "@/lib/ai/quality";
import type { FilmIssueContent } from "@/lib/film/types";

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

  // Product-level run triggers — generate/send today, no issueId.
  if (action === "run-dry" || action === "run-live") {
    if (!adminFeatureFlags().mutationsEnabled) {
      return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
    }
    if (action === "run-live" && !adminFeatureFlags().sendActionsEnabled) {
      return NextResponse.json({ ok: false, error: "admin_send_actions_disabled" }, { status: 403 });
    }
    const controls = (await getControls()).film;
    const dryRun = action === "run-dry" || controls.dryRun;
    const dateIso = typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
    const routeLabel = `/api/admin/film/issues/action:${action}`;
    const run = await startRun({
      productKey: ONE_FILM_PRODUCT_KEY,
      route: routeLabel,
      dryRun,
      requireApproval: controls.requireApproval,
      metadata: { manual: true, date: dateIso },
    });
    try {
      const r = await runOneFilmDailyPipeline({
        date: new Date(`${dateIso}T00:00:00Z`),
        dryRun,
        requireApproval: controls.requireApproval,
        send: dryRun ? undefined : (a: SendArgs) => sendDailyEmail(a),
      });
      await finishRun({
        id: run.id,
        status: "SUCCESS",
        generatedCount: r.segments.generated,
        sentCount: r.sends.sent,
        skippedCount: r.sends.skipped,
        failedCount: r.sends.failed,
        metadata: r as never,
      });
      await recordAudit({
        actor,
        action: `film.run.${action}`,
        targetType: "FilmDailyIssue",
        targetId: dateIso,
        metadata: { mode: dryRun ? "dry" : "live", ...r.sends } as never,
      });
      return NextResponse.json({
        ok: true,
        result: {
          generated: r.segments.generated,
          sent: r.sends.sent,
          skipped: r.sends.skipped,
          failed: r.sends.failed,
          wouldSend: r.sends.dryRun,
          dryRun,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "run_failed";
      await finishRun({ id: run.id, status: "FAILED", error: message });
      await notifyRunFailure({ productName: "OneFilm", route: routeLabel, error: message });
      return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
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
    case "edit-content": {
      const raw = body.content;
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return NextResponse.json({ ok: false, error: "invalid_content" }, { status: 400 });
      }
      const current = issue.contentJson as unknown as FilmIssueContent;
      const input = raw as Record<string, unknown>;
      const required = ["openingLine", "whyThisFilm", "whatItFeelsLike", "bestWatchedWhen", "beforeYouPressPlay", "spoilerNote"] as const;
      if (required.some((key) => typeof input[key] !== "string" || !(input[key] as string).trim())) {
        return NextResponse.json({ ok: false, error: "required_content_missing" }, { status: 400 });
      }
      const content: FilmIssueContent = {
        ...current,
        greeting: typeof input.greeting === "string" ? input.greeting.trim() : current.greeting,
        openingLine: String(input.openingLine).trim(),
        filmTitle: issue.filmTitle ?? current.filmTitle,
        whyThisFilm: String(input.whyThisFilm).trim(),
        whatItFeelsLike: String(input.whatItFeelsLike).trim(),
        bestWatchedWhen: String(input.bestWatchedWhen).trim(),
        beforeYouPressPlay: String(input.beforeYouPressPlay).trim(),
        spoilerNote: String(input.spoilerNote).trim(),
        metadata: current.metadata,
      };
      const report = toReport(runSharedGates(content, { maxFieldLength: 1800 }));
      if (!report.ok) return NextResponse.json({ ok: false, error: "quality_gate_failed", findings: report.findings }, { status: 400 });
      const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 120) : issue.subject;
      const previewText = typeof body.previewText === "string" ? body.previewText.trim().slice(0, 180) : issue.previewText;
      if (!subject) return NextResponse.json({ ok: false, error: "missing_subject" }, { status: 400 });
      await prisma.filmDailyIssue.update({ where: { id: issue.id }, data: {
        subject, previewText, contentJson: content as unknown as Prisma.InputJsonObject,
        approvalStatus: "PENDING", approvedAt: null, approvedBy: null,
        generationMetadata: { ...(metaObject(issue.generationMetadata)), adminEditedAt: new Date().toISOString(), warnings: report.warnings } as Prisma.InputJsonObject,
      } });
      result = { status: "PENDING", warnings: report.warnings };
      break;
    }
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
      if (body.confirmation !== "SEND ONEFILM NOW") {
        return NextResponse.json({ ok: false, error: "confirmation_required" }, { status: 400 });
      }
      const manualRoute = "/api/admin/film/issues/action:send-now";
      const manualRun = await startRun({ productKey: ONE_FILM_PRODUCT_KEY, route: manualRoute, dryRun: false, requireApproval: false, metadata: { issueId: issue.id } });
      try {
        const pipelineResult = await runOneFilmDailyPipeline({ date: issue.issueDate, segmentKey: issue.segmentKey, sendNow: true, requireApproval: false });
        await finishRun({ id: manualRun.id, status: "SUCCESS", sentCount: pipelineResult.sends.sent, skippedCount: pipelineResult.sends.skipped, failedCount: pipelineResult.sends.failed, metadata: pipelineResult as never });
        result = pipelineResult.sends;
      } catch (error) {
        const message = error instanceof Error ? error.message : "OneFilm manual send failed";
        await finishRun({ id: manualRun.id, status: "FAILED", error: message });
        await notifyRunFailure({ productName: "OneFilm", route: manualRoute, error: message });
        throw error;
      }
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

function metaObject(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Prisma.JsonValue> : {};
}
