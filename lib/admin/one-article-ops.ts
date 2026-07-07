import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ingestCandidates } from "@/lib/ingest";
import { rssSource } from "@/lib/rss-source";
import { extractAndScorePendingArticles } from "@/lib/scorer";
import { selectTopicDailyPicks } from "@/lib/pipeline";
import {
  defaultSummaryProvider,
  getOrCreateSummary,
  type SummaryRequest,
  type SummaryResult,
} from "@/lib/summarizer";
import { ONE_ARTICLE_PRODUCT_KEY, SUMMARY_LANGUAGES } from "@/lib/options";
import { evaluateEligibility } from "@/lib/subscriptions";
import { ALL_TOPIC_SLUGS, interestLabelsToSlugs } from "@/lib/topics";
import { isApprovalRequired, SENDABLE_APPROVAL_STATUSES } from "@/lib/admin/issues-config";
import { loadOneArticleSubs, type SubWithRels } from "@/lib/admin/queries";
import { SEND_HOUR_LOCAL, SEND_TIMEZONE, isoDate, sendInstantUtc, todayUtc } from "@/lib/admin/format";
import { recordAudit } from "@/lib/admin/audit";
import type { Article, TopicDailyPick } from "@prisma/client";
import { getLlmStatus } from "@/lib/llm";

const DAY_MS = 24 * 60 * 60 * 1000;

type PickWithArticle = TopicDailyPick & { article: Article | null };

export function oneArticleCronEnabled(): boolean {
  return process.env.ONE_ARTICLE_CRON_ENABLED !== "false";
}

export function oneArticleDryRunForced(): boolean {
  return process.env.ONE_ARTICLE_DRY_RUN === "true";
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export interface OneArticleAiStatus {
  provider: string;
  selectedProviderLabel: string;
  geminiKeyConfigured: boolean;
  activeModel: string;
  scorerEnabled: boolean;
  summaryGeneratorEnabled: boolean;
  productionReady: boolean;
  statusLabel: string;
  blocker: string | null;
  warnings: string[];
}

export function getOneArticleAiStatus(): OneArticleAiStatus {
  const status = getLlmStatus();
  const provider = status.provider;
  const providerSelected = provider !== "none" && provider !== "off";
  const geminiSelected = provider === "gemini";
  const geminiKeyConfigured = status.gemini.configured;
  const configured = status.configured;
  const warnings: string[] = [];
  let statusLabel = "AI disabled";
  let blocker: string | null = "Set AI_PROVIDER=gemini";

  if (!providerSelected) {
    if (geminiKeyConfigured) {
      statusLabel = "Gemini key configured, but AI_PROVIDER is not set";
      blocker = "Set AI_PROVIDER=gemini";
    }
  } else if (geminiSelected && !geminiKeyConfigured) {
    statusLabel = "Gemini selected, key missing";
    blocker = "Set GEMINI_API_KEY";
  } else if (geminiSelected && geminiKeyConfigured && configured) {
    statusLabel = "Gemini active";
    blocker = null;
  } else if (configured) {
    statusLabel = `AI active (${provider})`;
    blocker = null;
    warnings.push("Gemini is not the selected provider.");
  } else {
    statusLabel = `AI provider ${provider} is not usable`;
    blocker = `Configure API key for AI_PROVIDER=${provider}`;
  }

  return {
    provider,
    selectedProviderLabel: providerSelected ? provider : "none",
    geminiKeyConfigured,
    activeModel: status.model,
    scorerEnabled: configured,
    summaryGeneratorEnabled: configured,
    productionReady: configured && geminiSelected && geminiKeyConfigured,
    statusLabel,
    blocker,
    warnings,
  };
}

export function nextOneArticleSend(now = new Date()): { localLabel: string; utc: Date } {
  const today = todayUtc();
  const todaySend = sendInstantUtc(isoDate(today));
  const utc = now < todaySend ? todaySend : new Date(todaySend.getTime() + DAY_MS);
  return {
    localLabel: `${isoDate(utc)} ${String(SEND_HOUR_LOCAL).padStart(2, "0")}:00 ${SEND_TIMEZONE}`,
    utc,
  };
}

export async function startOperationalRun(input: {
  route: string;
  dryRun: boolean;
  requireApproval: boolean;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.operationalRun.create({
    data: {
      productKey: ONE_ARTICLE_PRODUCT_KEY,
      route: input.route,
      dryRun: input.dryRun,
      requireApproval: input.requireApproval,
      metadata: input.metadata,
    },
  });
}

export async function finishOperationalRun(input: {
  id: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  generatedCount?: number;
  sentCount?: number;
  skippedCount?: number;
  failedCount?: number;
  error?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.operationalRun.update({
    where: { id: input.id },
    data: {
      status: input.status,
      finishedAt: new Date(),
      generatedCount: input.generatedCount ?? 0,
      sentCount: input.sentCount ?? 0,
      skippedCount: input.skippedCount ?? 0,
      failedCount: input.failedCount ?? 0,
      error: input.error ?? null,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
    },
  });
}

export interface OneArticleReadiness {
  issueDate: string;
  status: string;
  blockers: string[];
  warnings: string[];
  nextAction: string;
  eligibleCount: number;
  issueExists: boolean;
  issueCount: number;
  generatedContentExists: boolean;
  approved: boolean;
  scheduled: boolean;
  cronEnabled: boolean;
  dryRun: boolean;
  emailProviderConfigured: boolean;
  sourceArticleExists: boolean;
  alreadySentCount: number;
  failedCount: number;
  subject: string | null;
  previewText: string | null;
  scheduledFor: Date | null;
  pickId: string | null;
}

export async function getOneArticleIssueReadiness(input: {
  date?: Date;
  pickId?: string;
}): Promise<OneArticleReadiness> {
  const date = input.date ? atUtcMidnight(input.date) : undefined;
  const pick = input.pickId
    ? await prisma.topicDailyPick.findUnique({
        where: { id: input.pickId },
        include: { article: true, summaries: true, sends: true },
      })
    : null;
  const day = pick?.date ?? date ?? todayUtc();
  const issueDate = isoDate(day);
  const picks = pick
    ? [pick]
    : await prisma.topicDailyPick.findMany({
        where: { date: day },
        include: { article: true, summaries: true, sends: true },
        orderBy: [{ approvalStatus: "desc" }, { updatedAt: "desc" }],
      });
  const primary = picks.find((p) => p.approvalStatus === "SCHEDULED") ?? picks[0] ?? null;
  const subs = await loadOneArticleSubs();
  const eligibleCount = subs.filter((s) => evaluateEligibility(s).allowed).length;

  const blockers: string[] = [];
  const warnings: string[] = [];
  const cronEnabled = oneArticleCronEnabled();
  const dryRun = oneArticleDryRunForced();
  const aiStatus = getOneArticleAiStatus();
  const emailProviderConfigured = resendConfigured();
  const generatedContentExists = picks.some((p) => p.summaries.some((s) => s.status === "READY"));
  const approved = picks.some((p) => (SENDABLE_APPROVAL_STATUSES as readonly string[]).includes(p.approvalStatus));
  const scheduled = picks.some((p) => p.approvalStatus === "SCHEDULED" && p.scheduledFor);
  const sendableReadyContentExists = picks.some(
    (p) =>
      (!isApprovalRequired() || (SENDABLE_APPROVAL_STATUSES as readonly string[]).includes(p.approvalStatus)) &&
      p.summaries.some((s) => s.status === "READY"),
  );
  const sourceArticleExists = Boolean(primary?.articleId);
  const alreadySentCount = picks.reduce((sum, p) => sum + p.sends.filter((s) => s.status === "SENT").length, 0);
  const failedCount = picks.reduce((sum, p) => sum + p.sends.filter((s) => s.status === "FAILED").length, 0);

  if (picks.length === 0) blockers.push("No issue prepared for this date.");
  if (picks.length > 0 && !generatedContentExists) blockers.push("No generated or manual email content is ready.");
  if (!generatedContentExists && aiStatus.blocker) blockers.push(`${aiStatus.blocker}.`);
  if (isApprovalRequired() && !approved) blockers.push("Approval is required but no issue is approved.");
  if (isApprovalRequired() && approved && !sendableReadyContentExists) {
    blockers.push("Approved or scheduled issue has no ready email content.");
  }
  if (!emailProviderConfigured) blockers.push("Resend is not configured.");
  if (eligibleCount === 0) blockers.push("No eligible subscribers.");
  if (!cronEnabled) warnings.push("Cron is disabled. Scheduled emails will not send.");
  if (dryRun) warnings.push("Dry-run mode is enabled. No real subscriber emails will send.");
  if (primary && !sourceArticleExists) warnings.push("No source article linked.");
  if (!aiStatus.productionReady) warnings.push(aiStatus.statusLabel);
  for (const warning of aiStatus.warnings) warnings.push(warning);
  if (alreadySentCount > 0) warnings.push(`This issue has already been sent to ${alreadySentCount} subscriber(s).`);
  if (primary?.summaries.some((s) => s.adminEditedAt && primary.approvedAt && s.adminEditedAt > primary.approvedAt)) {
    warnings.push("Issue was manually edited after approval. Re-approval recommended.");
  }

  const status = readinessStatus({ blockers, warnings, generatedContentExists: sendableReadyContentExists, approved, scheduled, alreadySentCount });
  const summary = primary?.summaries.find((s) => s.status === "READY") ?? primary?.summaries[0] ?? null;
  const structured = summary?.structuredJsonOverride ?? summary?.structuredJson;
  const subject =
    summary?.subjectOverride ??
    (isObject(structured) && typeof structured.subject === "string" ? structured.subject : null);
  const previewText =
    summary?.previewTextOverride ??
    (isObject(structured) && typeof structured.preheader === "string" ? structured.preheader : null);

  return {
    issueDate,
    status,
    blockers,
    warnings,
    nextAction: nextActionFor(blockers, sendableReadyContentExists || generatedContentExists, approved, scheduled),
    eligibleCount,
    issueExists: picks.length > 0,
    issueCount: picks.length,
    generatedContentExists,
    approved,
    scheduled,
    cronEnabled,
    dryRun,
    emailProviderConfigured,
    sourceArticleExists,
    alreadySentCount,
    failedCount,
    subject,
    previewText,
    scheduledFor: primary?.scheduledFor ?? null,
    pickId: primary?.id ?? null,
  };
}

export async function prepareOneArticleIssues(input: {
  date: Date;
  regeneratePickId?: string;
  actor: string;
  skipIngest?: boolean;
}): Promise<{ date: string; picks: number; summariesReady: number; summariesRejected: number }> {
  const day = atUtcMidnight(input.date);
  if (input.regeneratePickId) {
    const pick = await prisma.topicDailyPick.findUnique({ where: { id: input.regeneratePickId } });
    if (!pick) throw new Error("issue_not_found");
    await prisma.summary.deleteMany({ where: { topicDailyPickId: input.regeneratePickId } });
    await prisma.topicDailyPick.update({
      where: { id: input.regeneratePickId },
      data: { approvalStatus: "PENDING", scheduledFor: null, approvedAt: null, approvedBy: null },
    });
  } else if (!input.skipIngest) {
    await ingestCandidates(day, [rssSource]);
    await extractAndScorePendingArticles();
    await selectTopicDailyPicks(day);
  }

  const picks = await prisma.topicDailyPick.findMany({
    where: input.regeneratePickId ? { id: input.regeneratePickId } : { date: day },
    include: { article: true },
  });
  const subs = await loadOneArticleSubs();
  const provider = defaultSummaryProvider();
  let ready = 0;
  let rejected = 0;

  for (const pick of picks) {
    if (!pick.article) continue;
    const targets = summaryTargetsForPick(pick, subs);
    for (const target of targets) {
      const summary = await getOrCreateSummary(
        {
          pick: {
            id: pick.id,
            topic: pick.topic,
            subtopics: pick.subtopics,
            articleTitle: pick.articleTitle,
            sourceName: pick.sourceName,
          },
          article: {
            title: pick.article.title,
            url: pick.article.url,
            rawExcerpt: pick.article.rawExcerpt,
            cleanedText: pick.article.cleanedText,
            sourceLanguage: pick.article.sourceLanguage,
            sourceName: pick.article.sourceName,
          },
          summaryLanguage: target.summaryLanguage,
          primaryTopic: target.primaryTopic,
          difficulty: target.difficulty,
        },
        provider,
      );
      if (summary.status === "READY") ready++;
      else rejected++;
    }
  }

  await recordAudit({
    actor: input.actor,
    action: input.regeneratePickId ? "oneArticle.regenerate" : "oneArticle.prepare",
    targetType: input.regeneratePickId ? "TopicDailyPick" : "OneArticleDate",
    targetId: input.regeneratePickId ?? isoDate(day),
    metadata: { date: isoDate(day), picks: picks.length, summariesReady: ready, summariesRejected: rejected },
  });

  return { date: isoDate(day), picks: picks.length, summariesReady: ready, summariesRejected: rejected };
}

export async function rescoreOneArticle(input: {
  actor: string;
  articleId: string;
}): Promise<{ articleId: string; result: Awaited<ReturnType<typeof extractAndScorePendingArticles>> }> {
  const article = await prisma.article.findUnique({ where: { id: input.articleId } });
  if (!article) throw new Error("article_not_found");
  await prisma.article.update({
    where: { id: input.articleId },
    data: {
      scoringStatus: "PENDING",
      rejectionReason: null,
      reasonForSelection: null,
    },
  });
  const result = await extractAndScorePendingArticles({ articleIds: [input.articleId], limit: 1 });
  await recordAudit({
    actor: input.actor,
    action: "oneArticle.article.rescore",
    targetType: "Article",
    targetId: input.articleId,
    metadata: result as unknown as Prisma.InputJsonObject,
  });
  return { articleId: input.articleId, result };
}

export async function rescorePendingOneArticles(input: {
  actor: string;
  limit?: number;
}): Promise<Awaited<ReturnType<typeof extractAndScorePendingArticles>>> {
  const result = await extractAndScorePendingArticles({ limit: input.limit ?? 60 });
  await recordAudit({
    actor: input.actor,
    action: "oneArticle.article.rescorePending",
    targetType: "Article",
    targetId: "pending",
    metadata: result as unknown as Prisma.InputJsonObject,
  });
  return result;
}

export async function markOneArticleCandidate(input: {
  actor: string;
  articleId: string;
}) {
  const article = await prisma.article.findUnique({ where: { id: input.articleId } });
  if (!article) throw new Error("article_not_found");
  const tags = Array.from(new Set([...article.tags, "admin-candidate"]));
  const updated = await prisma.article.update({
    where: { id: input.articleId },
    data: { tags },
  });
  await recordAudit({
    actor: input.actor,
    action: "oneArticle.article.markCandidate",
    targetType: "Article",
    targetId: input.articleId,
    metadata: { previousStatus: article.scoringStatus, tags } as Prisma.InputJsonObject,
  });
  return updated;
}

export async function rejectOneArticle(input: {
  actor: string;
  articleId: string;
  reason?: string | null;
}) {
  const article = await prisma.article.findUnique({ where: { id: input.articleId } });
  if (!article) throw new Error("article_not_found");
  const updated = await prisma.article.update({
    where: { id: input.articleId },
    data: {
      scoringStatus: "REJECTED",
      rejectionReason: input.reason?.trim() || "Rejected by admin",
    },
  });
  await recordAudit({
    actor: input.actor,
    action: "oneArticle.article.reject",
    targetType: "Article",
    targetId: input.articleId,
    metadata: { reason: updated.rejectionReason } as Prisma.InputJsonObject,
  });
  return updated;
}

export async function createIssueFromArticle(input: {
  actor: string;
  articleId: string;
  date: Date;
}): Promise<{ pickId: string; date: string; summariesReady: number; summariesRejected: number }> {
  const article = await prisma.article.findUnique({ where: { id: input.articleId } });
  if (!article) throw new Error("article_not_found");
  if (article.scoringStatus === "PENDING") throw new Error("article_pending_scoring");
  if (!article.cleanedText && !article.rawExcerpt) throw new Error("article_has_no_content");

  const day = atUtcMidnight(input.date);
  const pick = await prisma.topicDailyPick.upsert({
    where: {
      date_topic_sourceLanguage: {
        date: day,
        topic: article.topic,
        sourceLanguage: article.sourceLanguage,
      },
    },
    update: {
      articleId: article.id,
      articleTitle: article.title,
      sourceName: article.sourceName,
      subtopics: article.subtopics,
      score: article.morningReadScore || article.qualityScore,
      reasonForSelection:
        article.reasonForSelection || "Admin selected this article for the issue.",
      status: "READY",
      approvalStatus: "PENDING",
      scheduledFor: null,
      approvedAt: null,
      approvedBy: null,
    },
    create: {
      date: day,
      topic: article.topic,
      subtopics: article.subtopics,
      sourceLanguage: article.sourceLanguage,
      articleId: article.id,
      articleTitle: article.title,
      sourceName: article.sourceName,
      score: article.morningReadScore || article.qualityScore,
      reasonForSelection:
        article.reasonForSelection || "Admin selected this article for the issue.",
      status: "READY",
      approvalStatus: "PENDING",
    },
  });

  const subs = await loadOneArticleSubs();
  const provider = defaultSummaryProvider();
  const targets = summaryTargetsForPick({ ...pick, article }, subs);
  let summariesReady = 0;
  let summariesRejected = 0;

  for (const target of targets) {
    const summary = await getOrCreateSummary(
      {
        pick: {
          id: pick.id,
          topic: pick.topic,
          subtopics: pick.subtopics,
          articleTitle: pick.articleTitle,
          sourceName: pick.sourceName,
        },
        article: {
          title: article.title,
          url: article.url,
          rawExcerpt: article.rawExcerpt,
          cleanedText: article.cleanedText,
          sourceLanguage: article.sourceLanguage,
          sourceName: article.sourceName,
        },
        summaryLanguage: target.summaryLanguage,
        primaryTopic: target.primaryTopic,
        difficulty: target.difficulty,
      },
      provider,
    );
    if (summary.status === "READY") summariesReady++;
    else summariesRejected++;
  }

  await recordAudit({
    actor: input.actor,
    action: "oneArticle.issue.createFromArticle",
    targetType: "TopicDailyPick",
    targetId: pick.id,
    metadata: {
      date: isoDate(day),
      articleId: article.id,
      summariesReady,
      summariesRejected,
    } as Prisma.InputJsonObject,
  });

  return { pickId: pick.id, date: isoDate(day), summariesReady, summariesRejected };
}

export async function createManualOneArticleIssue(input: {
  actor: string;
  date: Date;
  topic: string;
  sourceLanguage: string;
  summaryLanguage: string;
  title: string;
  sourceName?: string | null;
  subject: string;
  previewText?: string | null;
  bodyText: string;
  adminNotes?: string | null;
  acknowledgeNoSource: boolean;
  /**
   * When true the issue is saved in the DRAFT editorial state (pick + summary
   * status = DRAFT) so it never enters the send path until an admin promotes
   * it to READY. Defaults to false (the historical behaviour: create as READY).
   */
  draft?: boolean;
  /**
   * Source label for the generated content: "manual" for hand-written, or the
   * AI provider id when the body came from `generateOneArticleDraft`. Purely
   * informational — surfaced in the authoring list.
   */
  generator?: string | null;
}) {
  if (!input.acknowledgeNoSource) throw new Error("manual_issue_requires_no_source_ack");
  if (!ALL_TOPIC_SLUGS.includes(input.topic as never)) throw new Error("invalid_topic");
  if (!input.title.trim()) throw new Error("title_required");
  // Drafts may be saved incomplete; a READY issue needs subject + body.
  if (!input.draft) {
    if (!input.subject.trim()) throw new Error("subject_required");
    if (!input.bodyText.trim()) throw new Error("body_required");
  }
  const editorialStatus = input.draft ? "DRAFT" : "READY";
  const generator = input.generator?.trim() || "manual";
  const day = atUtcMidnight(input.date);
  const pick = await prisma.topicDailyPick.create({
    data: {
      date: day,
      topic: input.topic,
      subtopics: [],
      sourceLanguage: input.sourceLanguage,
      articleId: null,
      articleTitle: input.title.trim(),
      sourceName: input.sourceName?.trim() || "Manual",
      score: 1,
      reasonForSelection: "Manual OneArticle issue without source article.",
      status: editorialStatus,
      approvalStatus: "PENDING",
      adminNotes: input.adminNotes?.trim() || null,
    },
  });
  await prisma.summary.create({
    data: {
      topicDailyPickId: pick.id,
      summaryLanguage: validSummaryLanguage(input.summaryLanguage),
      primaryTopic: input.topic,
      difficulty: "mixed",
      bodyText: input.bodyText.trim(),
      bodyHtml: paragraphsToHtml(input.bodyText),
      structuredJson: {
        summaryLanguage: validSummaryLanguage(input.summaryLanguage),
        displayTitle: input.title.trim(),
        subject: input.subject.trim(),
        preheader: input.previewText?.trim() || "",
        oneLineHook: "",
        whyThisArticle: "",
        readingTime: "",
        threeSentenceSummary: input.bodyText.trim() ? [input.bodyText.trim()] : [],
        keyTakeaways: [],
        oneThingToRemember: "",
        confidence: 100,
      } as Prisma.InputJsonObject,
      confidence: 100,
      status: editorialStatus,
      generator,
      subjectOverride: input.subject.trim() || null,
      previewTextOverride: input.previewText?.trim() || null,
      adminEditedAt: new Date(),
    },
  });
  await recordAudit({
    actor: input.actor,
    action: "oneArticle.manualIssue.create",
    targetType: "TopicDailyPick",
    targetId: pick.id,
    metadata: {
      date: isoDate(day),
      topic: input.topic,
      summaryLanguage: input.summaryLanguage,
      draft: Boolean(input.draft),
      generator,
    },
  });
  return pick;
}

/**
 * Promote or demote an authored issue between DRAFT and READY. Only ever moves
 * DRAFT↔READY summaries; REJECTED summaries are left untouched. Never approves,
 * schedules, or sends — that stays with the approval workflow.
 */
export async function setOneArticleIssueStatus(input: {
  actor: string;
  pickId: string;
  status: "DRAFT" | "READY";
}): Promise<{ pickId: string; status: "DRAFT" | "READY" }> {
  const pick = await prisma.topicDailyPick.findUnique({ where: { id: input.pickId } });
  if (!pick) throw new Error("issue_not_found");
  await prisma.topicDailyPick.update({
    where: { id: input.pickId },
    data: { status: input.status },
  });
  await prisma.summary.updateMany({
    where: { topicDailyPickId: input.pickId, status: { in: ["DRAFT", "READY"] } },
    data: { status: input.status },
  });
  await recordAudit({
    actor: input.actor,
    action: "oneArticle.issue.setStatus",
    targetType: "TopicDailyPick",
    targetId: input.pickId,
    metadata: { from: pick.status, to: input.status },
  });
  return { pickId: input.pickId, status: input.status };
}

/**
 * Generate an editable draft from a topic + pasted source text using the
 * configured summary provider — WITHOUT persisting anything. Reuses the exact
 * production summarizer, so with GEMINI_API_KEY set the admin sees real model
 * output; locally (no key) it falls back to the dev heuristic. The caller
 * populates the authoring form with the returned fields, then saves via
 * `createManualOneArticleIssue`.
 */
export async function generateOneArticleDraft(input: {
  title: string;
  sourceText: string;
  sourceName?: string | null;
  url?: string | null;
  sourceLanguage: string;
  summaryLanguage: string;
  topic: string;
  difficulty?: string;
}): Promise<{ result: SummaryResult; aiStatus: OneArticleAiStatus }> {
  if (!input.title.trim()) throw new Error("title_required");
  if (!input.sourceText.trim()) throw new Error("source_text_required");
  if (!ALL_TOPIC_SLUGS.includes(input.topic as never)) throw new Error("invalid_topic");

  const req: SummaryRequest = {
    // The provider never reads `pick`; a placeholder id keeps the type honest.
    pick: {
      id: "draft-preview",
      topic: input.topic,
      subtopics: [],
      articleTitle: input.title.trim(),
      sourceName: input.sourceName?.trim() || "Manual",
    },
    article: {
      title: input.title.trim(),
      url: input.url?.trim() || "https://oneread.email/manual-draft",
      rawExcerpt: input.sourceText.trim(),
      cleanedText: input.sourceText.trim(),
      sourceLanguage: input.sourceLanguage,
      sourceName: input.sourceName?.trim() || "Manual",
    },
    summaryLanguage: validSummaryLanguage(input.summaryLanguage),
    primaryTopic: input.topic,
    difficulty: input.difficulty?.trim() || "mixed",
  };

  const result = await defaultSummaryProvider().generate(req);
  return { result, aiStatus: getOneArticleAiStatus() };
}

function summaryTargetsForPick(pick: PickWithArticle, subs: SubWithRels[]) {
  const out = new Map<string, { summaryLanguage: string; primaryTopic: string; difficulty: string }>();
  for (const sub of subs) {
    if (!evaluateEligibility(sub).allowed || !subscriberMatchesPick(sub, pick)) continue;
    const prefs = sub.preferences;
    const summaryLanguage = prefs?.summaryLanguage || "English";
    const primaryTopic = prefs?.primaryInterest || pick.topic;
    const difficulty = prefs?.preferredDifficulty || "mixed";
    out.set(`${summaryLanguage}::${primaryTopic}::${difficulty}`, { summaryLanguage, primaryTopic, difficulty });
  }
  if (out.size === 0) out.set(`English::${pick.topic}::mixed`, { summaryLanguage: "English", primaryTopic: pick.topic, difficulty: "mixed" });
  return [...out.values()];
}

function subscriberMatchesPick(sub: SubWithRels, pick: PickWithArticle): boolean {
  const prefs = sub.preferences;
  if (!prefs) return false;
  const slugs = new Set([
    ...(prefs.primaryInterest ? [prefs.primaryInterest] : []),
    ...prefs.secondaryInterests,
    ...interestLabelsToSlugs(prefs.interests),
  ]);
  return slugs.has(pick.topic) || pick.subtopics.some((s) => slugs.has(s));
}

function readinessStatus(input: {
  blockers: string[];
  warnings: string[];
  generatedContentExists: boolean;
  approved: boolean;
  scheduled: boolean;
  alreadySentCount: number;
}): string {
  if (input.alreadySentCount > 0) return "Already sent";
  if (input.blockers.some((b) => b.includes("No issue"))) return "Needs content";
  if (input.blockers.some((b) => b.includes("Approval"))) return "Needs approval";
  if (input.blockers.length > 0) return "Blocked";
  if (input.scheduled) return "Ready for scheduled send";
  if (input.approved) return "Approved, not scheduled";
  return input.generatedContentExists ? "Needs approval" : "Needs content";
}

function nextActionFor(blockers: string[], generated: boolean, approved: boolean, scheduled: boolean): string {
  if (!generated) return "Generate or write issue content";
  if (blockers.some((b) => b.includes("Resend"))) return "Configure Resend";
  if (blockers.some((b) => b.includes("eligible"))) return "Review subscriber eligibility";
  if (!approved) return "Approve issue";
  if (!scheduled) return "Schedule for 7:00 AM";
  return "Monitor next cron run";
}

function validSummaryLanguage(value: string): string {
  return (SUMMARY_LANGUAGES as readonly string[]).includes(value) ? value : "English";
}

function paragraphsToHtml(text: string): string {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;color:#1B1612;font-size:15.5px;line-height:1.65;">${escapeHtml(p.trim())}</p>`)
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function atUtcMidnight(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
