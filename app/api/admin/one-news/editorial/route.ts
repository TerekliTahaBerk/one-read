import { NextResponse } from "next/server";
import { requireAdminMutation, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import {
  cancelOneNewsIssue,
  createOneNewsIssue,
  decideOneNewsCorrectionEmail,
  recordOneNewsCorrection,
  replaceOneNewsSources,
  returnOneNewsIssueToDraft,
  scheduleOneNewsIssue,
  setOneNewsIssueReady,
  updateOneNewsIssue,
  type OneNewsCorrectionDecision,
  type OneNewsCorrectionType,
  type OneNewsIssueInput,
} from "@/lib/one-news/editorial";
import type { OneNewsSourceInput } from "@/lib/one-news/validation";

/**
 * Minimal editorial plumbing for OneNews.
 *
 * Deliberately absent: any send, test-send or dispatch action. C3 has no
 * OneNews delivery path at all, so there is nothing here that could reach a
 * subscriber. `schedule` records an intended time and nothing consumes it.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const denied = await requireAdminMutation(request, body);
  if (denied) return denied;
  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
  }

  const action = str(body.action);
  // The audit actor is the authenticated human. It is also what the domain
  // layer checks before it will approve, schedule or correct an edition.
  const actor = await adminActorLabel(request, body);
  const issueId = str(body.issueId);

  try {
    switch (action) {
      case "create": {
        const issue = await createOneNewsIssue(inputFrom(body), actor);
        return await audited(actor, action, issue);
      }
      case "update": {
        const issue = await updateOneNewsIssue({
          id: issueId,
          version: Number(body.version),
          input: inputFrom(body),
          actor,
        });
        return await audited(actor, action, issue);
      }
      case "sources": {
        await replaceOneNewsSources({
          issueId,
          sources: sourcesFrom(body.sources),
          actor,
        });
        await recordAudit({
          actor,
          action: "oneNews.editorial.sources",
          targetType: "OneNewsIssue",
          targetId: issueId,
          metadata: { count: sourcesFrom(body.sources).length },
        });
        return NextResponse.json({ ok: true });
      }
      case "ready": {
        const issue = await setOneNewsIssueReady(issueId, actor);
        return await audited(actor, action, issue);
      }
      case "draft": {
        const issue = await returnOneNewsIssueToDraft(issueId, actor);
        return await audited(actor, action, issue);
      }
      case "schedule": {
        const issue = await scheduleOneNewsIssue({
          id: issueId,
          scheduledFor: new Date(str(body.scheduledFor)),
          actor,
        });
        return await audited(actor, action, issue);
      }
      case "cancel": {
        const issue = await cancelOneNewsIssue(issueId, actor);
        return await audited(actor, action, issue);
      }
      case "correction": {
        const correction = await recordOneNewsCorrection({
          issueId,
          type: str(body.type) as OneNewsCorrectionType,
          note: str(body.note),
          actor,
        });
        await recordAudit({
          actor,
          action: "oneNews.editorial.correction",
          targetType: "OneNewsIssue",
          targetId: issueId,
          metadata: { correctionId: correction.id, type: correction.type },
        });
        return NextResponse.json({ ok: true, correction });
      }
      case "correction-decision": {
        const correction = await decideOneNewsCorrectionEmail({
          correctionId: str(body.correctionId),
          decision: str(body.decision) as OneNewsCorrectionDecision,
          actor,
        });
        await recordAudit({
          actor,
          action: "oneNews.editorial.correctionDecision",
          targetType: "OneNewsCorrection",
          targetId: correction.id,
          metadata: { decision: correction.correctionEmailDecision },
        });
        return NextResponse.json({ ok: true, correction });
      }
      default:
        return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "editorial_action_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

async function audited(
  actor: string,
  action: string,
  issue: { id: string; status: string; readingLanguage: string },
): Promise<Response> {
  await recordAudit({
    actor,
    action: `oneNews.editorial.${action}`,
    targetType: "OneNewsIssue",
    targetId: issue.id,
    metadata: { status: issue.status, language: issue.readingLanguage },
  });
  return NextResponse.json({ ok: true, issue });
}

function inputFrom(body: Record<string, unknown>): OneNewsIssueInput {
  return {
    readingLanguage: str(body.readingLanguage),
    subject: str(body.subject),
    previewText: str(body.previewText),
    headline: str(body.headline),
    dek: str(body.dek),
    whatHappened: str(body.whatHappened),
    whyItMatters: str(body.whyItMatters),
    whatsContested: str(body.whatsContested),
    whatToWatch: str(body.whatToWatch),
    developing: body.developing === true,
    asOf: date(body.asOf),
    adminNotes: str(body.adminNotes),
  };
}

function sourcesFrom(value: unknown): OneNewsSourceInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const source = (entry ?? {}) as Record<string, unknown>;
    return {
      url: str(source.url),
      title: str(source.title),
      publication: str(source.publication),
      sourceType: str(source.sourceType) || "REPORTING",
      publishedAt: date(source.publishedAt),
      accessedAt: date(source.accessedAt),
      note: str(source.note) || null,
      sortOrder: Number.isInteger(source.sortOrder) ? (source.sortOrder as number) : index,
    };
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function date(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
