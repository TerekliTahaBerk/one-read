import type { OneNewsIssue } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTransition, isEditable, type OneNewsStatus } from "./lifecycle";
import {
  validateOneNewsDraft,
  validateOneNewsIssue,
  type OneNewsContentInput,
  type OneNewsSourceInput,
  type OneNewsValidationResult,
} from "./validation";
import {
  buildOneNewsRenderModel,
  type OneNewsRenderModel,
} from "./render-model";

/**
 * OneNews editorial persistence.
 *
 * Scope note: this milestone owns the editorial half of the lifecycle only.
 * `scheduledFor` can be set and validated, but nothing here dispatches, and no
 * cron or provider call exists for OneNews. Delivery is C4's.
 */

export const ONE_NEWS_CORRECTION_TYPES = ["MINOR", "MATERIAL"] as const;
export type OneNewsCorrectionType = (typeof ONE_NEWS_CORRECTION_TYPES)[number];

export const ONE_NEWS_CORRECTION_DECISIONS = ["PENDING", "NOT_NEEDED", "QUEUED"] as const;
export type OneNewsCorrectionDecision = (typeof ONE_NEWS_CORRECTION_DECISIONS)[number];

/** A material correction note has to actually say what changed. */
const MIN_MATERIAL_CORRECTION_NOTE = 20;

/**
 * Actor labels that are not a person.
 *
 * Approving, scheduling and correcting an edition are human acts. Automation
 * — a cron, a script, an AI assistant helping the editor research — must never
 * be able to stand in for the editor at these boundaries, so the actor label
 * is checked rather than assumed. It is a guard rail, not a login: the route
 * layer still requires an authenticated admin session.
 */
const NON_HUMAN_ACTOR = /^(system|cron|job|worker|bot|ai|assistant|automation|llm|gemini|claude|openai)\b/i;

export function assertHumanEditor(actor: string): string {
  const clean = actor?.trim() ?? "";
  if (!clean || NON_HUMAN_ACTOR.test(clean)) throw new Error("human_editor_required");
  return clean;
}

export interface OneNewsIssueInput extends OneNewsContentInput {
  scheduledFor?: Date | null;
  timezone?: string;
}

export async function createOneNewsIssue(
  input: OneNewsIssueInput,
  actor: string,
): Promise<OneNewsIssue> {
  const editor = assertHumanEditor(actor);
  const validation = validateOneNewsDraft(input);
  if (!validation.valid) throw new Error(validation.errors[0].code);
  return prisma.oneNewsIssue.create({
    data: { ...normalizedIssueData(input), createdBy: editor, updatedBy: editor },
  });
}

export async function updateOneNewsIssue(args: {
  id: string;
  version: number;
  input: OneNewsIssueInput;
  actor: string;
}): Promise<OneNewsIssue> {
  const editor = assertHumanEditor(args.actor);
  const validation = validateOneNewsDraft(args.input);
  if (!validation.valid) throw new Error(validation.errors[0].code);
  const current = await prisma.oneNewsIssue.findUnique({ where: { id: args.id } });
  if (!current) throw new Error("issue_not_found");
  if (!isEditable(current.status)) throw new Error("issue_not_editable");
  const updated = await prisma.oneNewsIssue.updateMany({
    where: { id: args.id, version: args.version },
    data: {
      ...normalizedIssueData(args.input),
      updatedBy: editor,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new Error("version_conflict");
  return prisma.oneNewsIssue.findUniqueOrThrow({ where: { id: args.id } });
}

/**
 * Replaces an edition's source list in one transaction. Sources are part of
 * the edition, so they are edited as a set rather than as free-standing rows.
 */
export async function replaceOneNewsSources(args: {
  issueId: string;
  sources: readonly OneNewsSourceInput[];
  actor: string;
}): Promise<void> {
  const editor = assertHumanEditor(args.actor);
  const issue = await prisma.oneNewsIssue.findUniqueOrThrow({ where: { id: args.issueId } });
  if (!isEditable(issue.status)) throw new Error("issue_not_editable");
  const validation = validateOneNewsDraft(
    issueToContentInput(issue),
    args.sources,
  );
  if (!validation.valid) throw new Error(validation.errors[0].code);

  await prisma.$transaction([
    prisma.oneNewsSource.deleteMany({ where: { issueId: args.issueId } }),
    prisma.oneNewsSource.createMany({
      data: args.sources.map((source, index) => ({
        issueId: args.issueId,
        url: source.url.trim(),
        title: source.title.trim(),
        publication: source.publication.trim(),
        sourceType: source.sourceType,
        publishedAt: source.publishedAt ?? null,
        accessedAt: source.accessedAt ?? null,
        note: source.note?.trim() || null,
        sortOrder: source.sortOrder ?? index,
      })),
    }),
    prisma.oneNewsIssue.update({
      where: { id: args.issueId },
      data: { updatedBy: editor, version: { increment: 1 } },
    }),
  ]);
}

/**
 * The human approval gate.
 *
 * READY is never inferred. It requires an explicit action by a named human
 * editor *and* a clean validation pass — non-empty fields alone are not enough
 * to move an edition here.
 */
export async function setOneNewsIssueReady(id: string, actor: string): Promise<OneNewsIssue> {
  const editor = assertHumanEditor(actor);
  const { issue, validation } = await validateStoredOneNewsIssue(id);
  if (!validation.valid) throw new Error(validation.errors[0].code);
  assertTransition(issue.status, "READY");
  return prisma.oneNewsIssue.update({
    where: { id },
    data: {
      status: "READY",
      readyAt: new Date(),
      updatedBy: editor,
      version: { increment: 1 },
    },
  });
}

/** Pulling an edition back is always available to the editor. */
export async function returnOneNewsIssueToDraft(
  id: string,
  actor: string,
): Promise<OneNewsIssue> {
  const editor = assertHumanEditor(actor);
  const issue = await prisma.oneNewsIssue.findUniqueOrThrow({ where: { id } });
  if (issue.claimedAt) throw new Error("issue_already_dispatching");
  assertTransition(issue.status, "DRAFT");
  return prisma.oneNewsIssue.update({
    where: { id },
    data: {
      status: "DRAFT",
      readyAt: null,
      scheduledAt: null,
      canceledAt: null,
      updatedBy: editor,
      version: { increment: 1 },
    },
  });
}

/**
 * Records an intended send time. No dispatcher reads `scheduledFor` in this
 * milestone — scheduling an edition here does not send anything.
 */
export async function scheduleOneNewsIssue(args: {
  id: string;
  scheduledFor: Date;
  actor: string;
}): Promise<OneNewsIssue> {
  const editor = assertHumanEditor(args.actor);
  if (!Number.isFinite(args.scheduledFor.getTime())) throw new Error("invalid_schedule");
  if (args.scheduledFor.getTime() <= Date.now()) throw new Error("schedule_must_be_future");
  const { issue, validation } = await validateStoredOneNewsIssue(args.id);
  if (!validation.valid) throw new Error(validation.errors[0].code);
  assertTransition(issue.status, "SCHEDULED");
  return prisma.oneNewsIssue.update({
    where: { id: args.id },
    data: {
      status: "SCHEDULED",
      scheduledFor: args.scheduledFor,
      scheduledAt: new Date(),
      readyAt: issue.readyAt ?? new Date(),
      canceledAt: null,
      updatedBy: editor,
      version: { increment: 1 },
    },
  });
}

export async function cancelOneNewsIssue(id: string, actor: string): Promise<OneNewsIssue> {
  const editor = assertHumanEditor(actor);
  const issue = await prisma.oneNewsIssue.findUniqueOrThrow({ where: { id } });
  if (issue.claimedAt) throw new Error("issue_already_dispatching");
  assertTransition(issue.status, "CANCELED");
  return prisma.oneNewsIssue.update({
    where: { id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      updatedBy: editor,
      version: { increment: 1 },
    },
  });
}

/**
 * Appends a correction record. The record is the history: it is never rewritten
 * and never deleted, so a material change cannot be made to disappear.
 *
 * A material correction also increments the edition's version, so the version
 * an earlier correction points at stays meaningful. Sending a correction email
 * is a separate, explicit operator decision and is not implemented here.
 */
export async function recordOneNewsCorrection(args: {
  issueId: string;
  type: OneNewsCorrectionType;
  note: string;
  actor: string;
}) {
  const editor = assertHumanEditor(args.actor);
  if (!(ONE_NEWS_CORRECTION_TYPES as readonly string[]).includes(args.type)) {
    throw new Error("invalid_correction_type");
  }
  const note = args.note?.trim() ?? "";
  if (!note) throw new Error("correction_note_required");
  if (args.type === "MATERIAL" && note.length < MIN_MATERIAL_CORRECTION_NOTE) {
    throw new Error("material_correction_note_required");
  }
  const issue = await prisma.oneNewsIssue.findUniqueOrThrow({ where: { id: args.issueId } });
  // A correction describes content that already left the editor's hands.
  if (!issue.readyAt) throw new Error("issue_not_published");

  const isMaterial = args.type === "MATERIAL";
  const versionAfter = isMaterial ? issue.version + 1 : issue.version;

  const [correction] = await prisma.$transaction([
    prisma.oneNewsCorrection.create({
      data: {
        issueId: args.issueId,
        type: args.type,
        note,
        correctionEmailRecommended: isMaterial,
        versionBefore: issue.version,
        versionAfter,
        createdBy: editor,
      },
    }),
    ...(isMaterial
      ? [
          prisma.oneNewsIssue.update({
            where: { id: args.issueId },
            data: { updatedBy: editor, version: { increment: 1 } },
          }),
        ]
      : []),
  ]);
  return correction;
}

/**
 * Records the operator's decision about a correction email. C3 never sends
 * one; QUEUED only means "a human decided this warrants one".
 */
export async function decideOneNewsCorrectionEmail(args: {
  correctionId: string;
  decision: OneNewsCorrectionDecision;
  actor: string;
}) {
  const editor = assertHumanEditor(args.actor);
  if (!(ONE_NEWS_CORRECTION_DECISIONS as readonly string[]).includes(args.decision)) {
    throw new Error("invalid_correction_decision");
  }
  return prisma.oneNewsCorrection.update({
    where: { id: args.correctionId },
    data: {
      correctionEmailDecision: args.decision,
      correctionEmailDecidedAt: new Date(),
      correctionEmailDecidedBy: editor,
    },
  });
}

export async function loadOneNewsIssueBundle(id: string) {
  const issue = await prisma.oneNewsIssue.findUniqueOrThrow({
    where: { id },
    include: {
      sources: { orderBy: { sortOrder: "asc" } },
      corrections: { orderBy: { createdAt: "asc" } },
    },
  });
  return issue;
}

/** Validation of what is actually stored, used by the panel and by READY. */
export async function validateStoredOneNewsIssue(id: string): Promise<{
  issue: Awaited<ReturnType<typeof loadOneNewsIssueBundle>>;
  validation: OneNewsValidationResult;
}> {
  const issue = await loadOneNewsIssueBundle(id);
  return {
    issue,
    validation: validateOneNewsIssue(issueToContentInput(issue), issue.sources),
  };
}

/** The single mapping from stored rows to the canonical render model. */
export async function buildStoredOneNewsRenderModel(id: string): Promise<OneNewsRenderModel> {
  const issue = await loadOneNewsIssueBundle(id);
  return buildOneNewsRenderModel(issue, issue.sources, issue.corrections);
}

export function issueToContentInput(issue: {
  readingLanguage: string;
  subject: string;
  previewText: string | null;
  headline: string;
  dek: string;
  whatHappened: string;
  whyItMatters: string;
  whatsContested: string | null;
  whatToWatch: string;
  developing: boolean;
  asOf: Date | null;
}): OneNewsContentInput {
  return {
    readingLanguage: issue.readingLanguage,
    subject: issue.subject,
    previewText: issue.previewText,
    headline: issue.headline,
    dek: issue.dek,
    whatHappened: issue.whatHappened,
    whyItMatters: issue.whyItMatters,
    whatsContested: issue.whatsContested,
    whatToWatch: issue.whatToWatch,
    developing: issue.developing,
    asOf: issue.asOf,
  };
}

/** Editorial statuses an editor may move an edition to from the panel. */
export const ONE_NEWS_EDITOR_ACTIONS: readonly OneNewsStatus[] = [
  "DRAFT",
  "READY",
  "SCHEDULED",
  "CANCELED",
];

function normalizedIssueData(input: OneNewsIssueInput) {
  return {
    readingLanguage: input.readingLanguage,
    subject: input.subject.trim(),
    previewText: nullable(input.previewText),
    headline: input.headline.trim(),
    dek: input.dek.trim(),
    whatHappened: input.whatHappened.trim(),
    whyItMatters: input.whyItMatters.trim(),
    // Whitespace-only means "no contested section", not "an empty one".
    whatsContested: nullable(input.whatsContested),
    whatToWatch: input.whatToWatch.trim(),
    developing: input.developing ?? false,
    asOf: input.asOf ?? null,
    adminNotes: nullable(input.adminNotes),
    ...(input.timezone ? { timezone: input.timezone } : {}),
    ...(input.scheduledFor === undefined ? {} : { scheduledFor: input.scheduledFor }),
  };
}

function nullable(value: string | null | undefined): string | null {
  const clean = value?.trim();
  return clean ? clean : null;
}
