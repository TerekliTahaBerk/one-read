import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import {
  createIssueFromArticle,
  createManualOneArticleIssue,
  finishOperationalRun,
  markOneArticleCandidate,
  prepareOneArticleIssues,
  rejectOneArticle,
  rescoreOneArticle,
  rescorePendingOneArticles,
  setOneArticleIssueStatus,
  startOperationalRun,
} from "@/lib/admin/one-article-ops";
import { isApprovalRequired } from "@/lib/admin/issues-config";
import { runDailyPipeline } from "@/lib/pipeline";

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
  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
  }

  const action = str(body.action);
  if (
    ![
      "prepare-today",
      "prepare-tomorrow",
      "prepare-date",
      "pipeline-dry-run",
      "create-manual-issue",
      "set-issue-status",
      "rescore-article",
      "rescore-pending",
      "mark-candidate",
      "reject-article",
      "create-issue-from-article",
    ].includes(action)
  ) {
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }
  const manualDate = action === "create-manual-issue" ? parseDate(body.date) : null;
  if (action === "create-manual-issue" && !manualDate) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }

  const actor = adminActorLabel(req, body);
  const run = await startOperationalRun({
    route: `/api/admin/one-article/action:${action || "unknown"}`,
    dryRun: action === "pipeline-dry-run",
    requireApproval: isApprovalRequired(),
    metadata: { action } as Prisma.InputJsonObject,
  });

  try {
    let result: unknown;
    if (action === "prepare-today" || action === "prepare-tomorrow" || action === "prepare-date") {
      result = await prepareOneArticleIssues({
        date:
          action === "prepare-tomorrow"
            ? addDays(new Date(), 1)
            : action === "prepare-date"
              ? parseDate(body.date) ?? new Date()
              : new Date(),
        actor,
      });
      await finishOperationalRun({
        id: run.id,
        status: "SUCCESS",
        generatedCount: (result as { summariesReady?: number }).summariesReady ?? 0,
        metadata: result as Prisma.InputJsonObject,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "pipeline-dry-run") {
      const result = await runDailyPipeline({ dryRun: true, date: parseDate(body.date) ?? undefined });
      await finishOperationalRun({
        id: run.id,
        status: "SUCCESS",
        generatedCount: result.picks,
        sentCount: result.sends.sent,
        skippedCount: result.sends.skipped,
        failedCount: result.sends.failed,
        metadata: result as unknown as Prisma.InputJsonObject,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "create-manual-issue") {
      const pick = await createManualOneArticleIssue({
        actor,
        date: manualDate as Date,
        topic: str(body.topic),
        sourceLanguage: str(body.sourceLanguage) || "English",
        summaryLanguage: str(body.summaryLanguage) || "English",
        title: str(body.title),
        sourceName: str(body.sourceName) || "Manual",
        subject: str(body.subject),
        previewText: str(body.previewText) || null,
        bodyText: str(body.bodyText),
        adminNotes: str(body.adminNotes) || null,
        acknowledgeNoSource: body.acknowledgeNoSource === true,
        draft: body.draft === true,
        generator: str(body.generator) || null,
      });
      result = {
        pickId: pick.id,
        date: pick.date.toISOString().slice(0, 10),
        status: pick.status,
      };
      await finishOperationalRun({
        id: run.id,
        status: "SUCCESS",
        generatedCount: 1,
        metadata: result as Prisma.InputJsonObject,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "set-issue-status") {
      const status = str(body.status) === "READY" ? "READY" : "DRAFT";
      result = await setOneArticleIssueStatus({
        actor,
        pickId: str(body.pickId),
        status,
      });
      await finishOperationalRun({
        id: run.id,
        status: "SUCCESS",
        metadata: result as Prisma.InputJsonObject,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "rescore-article") {
      result = await rescoreOneArticle({ actor, articleId: str(body.articleId) });
      await finishOperationalRun({ id: run.id, status: "SUCCESS", metadata: result as Prisma.InputJsonObject });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "rescore-pending") {
      result = await rescorePendingOneArticles({ actor });
      await finishOperationalRun({
        id: run.id,
        status: "SUCCESS",
        generatedCount: (result as { scored?: number }).scored ?? 0,
        failedCount: (result as { failed?: number }).failed ?? 0,
        metadata: result as Prisma.InputJsonObject,
      });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "mark-candidate") {
      const article = await markOneArticleCandidate({ actor, articleId: str(body.articleId) });
      result = { articleId: article.id };
      await finishOperationalRun({ id: run.id, status: "SUCCESS", metadata: result as Prisma.InputJsonObject });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "reject-article") {
      const article = await rejectOneArticle({
        actor,
        articleId: str(body.articleId),
        reason: str(body.reason) || null,
      });
      result = { articleId: article.id, reason: article.rejectionReason };
      await finishOperationalRun({ id: run.id, status: "SUCCESS", metadata: result as Prisma.InputJsonObject });
      return NextResponse.json({ ok: true, result });
    }

    if (action === "create-issue-from-article") {
      const date = parseDate(body.date) ?? new Date();
      result = await createIssueFromArticle({ actor, articleId: str(body.articleId), date });
      await finishOperationalRun({
        id: run.id,
        status: "SUCCESS",
        generatedCount: (result as { summariesReady?: number }).summariesReady ?? 0,
        metadata: result as Prisma.InputJsonObject,
      });
      return NextResponse.json({ ok: true, result });
    }

    await finishOperationalRun({ id: run.id, status: "FAILED", error: "unhandled_action" });
    return NextResponse.json({ ok: false, error: "unhandled_action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "one_article_action_failed";
    await finishOperationalRun({ id: run.id, status: "FAILED", error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown): Date | null {
  const raw = str(value);
  if (!raw) return null;
  const d = new Date(`${raw.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
