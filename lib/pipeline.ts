/**
 * OneRead — daily editorial pipeline.
 *
 * High-level flow (one calendar day, UTC):
 *   1. Ingest candidate articles from RSS / Atom sources.
 *   2. Extract clean body text + LLM-score every PENDING article.
 *   3. For each (topic, sourceLanguage), select the single best article
 *      that clears the editorial threshold → write a `TopicDailyPick`.
 *   4. For each ACTIVE subscriber, score every relevant pick and choose
 *      the best one → write a `DailySend`.
 *   5. Generate (or reuse) the structured summary in their summary
 *      language. Skip the send if `summary.status === "REJECTED"`.
 *   6. Send via Resend, mark `DailySend.status = "SENT"`.
 *
 * Steps 1-4 are pure orchestration over Prisma. Steps 2 and 5 live
 * behind the `LlmProvider` interface so we can swap providers without
 * touching this file.
 *
 * Idempotency: every step is keyed by `(date, …)` unique constraints, so
 * the cron can safely retry without duplicating sends.
 */

import { prisma } from "./prisma";
import { ALL_TOPIC_SLUGS, type TopicSlug } from "./topics";
import {
  matchedTopicFor,
  scorePick,
  type ScoreBreakdown,
  type SubscriberContext,
} from "./personalization";
import {
  defaultSummaryProvider,
  getOrCreateSummary,
  summaryResultFromRow,
  type SummaryProvider,
  type SummaryResult,
} from "./summarizer";
import { renderDailyEmail } from "./email-template";
import { ingestCandidates, type IngestionSource } from "./ingest";
import { rssSource } from "./rss-source";
import { extractAndScorePendingArticles } from "./scorer";
import { getOneArticleEligibilityByEmail } from "./subscriptions";
import { isApprovalRequired, SENDABLE_APPROVAL_STATUSES } from "./admin/issues-config";
import {
  MIN_ARTICLE_SCORE,
  MIN_DELIVERY_SCORE,
  MIN_SUMMARY_CONFIDENCE,
  getEffectiveThresholds,
  isDemoModeEnabled,
} from "./thresholds";
import type {
  Article,
  DailySend,
  Subscriber,
  TopicDailyPick,
} from "@prisma/client";

/* ----------------------------------------------------------------------- */
/* Public entry points                                                     */
/* ----------------------------------------------------------------------- */

export interface DailyPipelineOptions {
  /** Defaults to today UTC. */
  date?: Date;
  /** Optional ingestion sources. Defaults to the configured RSS source. */
  ingestionSources?: readonly IngestionSource[];
  /** Optional LLM/heuristic summary provider. Defaults to the env-configured provider. */
  summaryProvider?: SummaryProvider;
  /** If true, generate sends but do not actually email. */
  dryRun?: boolean;
  /** If true, skip the ingest + extract + score stages (rerun rendering only). */
  skipIngest?: boolean;
  /**
   * Development-only demo mode. When true (and NODE_ENV !== "production"),
   * relaxed DEMO_* thresholds are used so demo/manual articles can flow
   * through the full pipeline for preview. Ignored in production.
   */
  demo?: boolean;
  /** Hook used by the email step. */
  send?: (args: SendArgs) => Promise<{ messageId?: string }>;
  /**
   * When true, only admin-approved issues (TopicDailyPick.approvalStatus in
   * APPROVED/SCHEDULED) are eligible to be sent. When omitted, falls back to
   * the ONE_ARTICLE_REQUIRE_APPROVAL env flag (default on for admin approval).
   * The admin "send now" path passes this explicitly so it is safe regardless
   * of the global flag.
   */
  requireApproval?: boolean;
  /** Optional admin send-now scope: send only this TopicDailyPick. */
  pickId?: string;
}

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface PipelineResult {
  date: string;
  ingested: number;
  /** Per-source observability: how many feeds we tried, how many failed. */
  sources: {
    attempted: number;
    failed: number;
    /** First-N error rows for the admin log. */
    errors: { slug: string; error: string }[];
  };
  extraction: { total: number; scored: number; rejected: number; failed: number };
  /** Demo + manually-entered candidate articles in the pool (testing aids). */
  manualOrDemoArticles: number;
  /** TopicDailyPick rows for this date backed by demo/manual articles. */
  manualOrDemoPicks: number;
  picks: number;
  /**
   * Per-stage summary counters. `summariesReady` includes cached READY
   * rows; `summariesRejected` covers low-confidence + LLM failures.
   */
  summaries: { ready: number; rejected: number };
  sends: { total: number; sent: number; skipped: number; failed: number };
  /**
   * Subscriber delivery mapping. `mapped` = DailySend rows created today;
   * `skipped` = ACTIVE subscribers with no send, plus a coarse reason each.
   */
  subscribers: {
    active: number;
    mapped: number;
    skipped: number;
    skippedReasons: { email: string; reason: string }[];
  };
  /**
   * Demo-mode reporting. `enabled` is true only when relaxed thresholds were
   * actually applied (dev + demo). Production thresholds are always echoed so
   * it's clear they were not changed.
   */
  demo: {
    enabled: boolean;
    thresholdsUsed: { minArticleScore: number; minDeliveryScore: number; minSummaryConfidence: number };
    productionThresholds: { minArticleScore: number; minDeliveryScore: number; minSummaryConfidence: number };
  };
  /** Wall-clock duration in ms. */
  durationMs: number;
}

/**
 * End-to-end orchestration. Safe to call multiple times for the same date.
 */
export async function runDailyPipeline(
  opts: DailyPipelineOptions = {},
): Promise<PipelineResult> {
  const t0 = Date.now();
  const date = atUtcMidnight(opts.date ?? new Date());
  const ingestionSources = opts.ingestionSources ?? [rssSource];

  // Resolve effective thresholds. Demo mode is hard-disabled in production.
  const thresholds = getEffectiveThresholds(opts.demo);

  console.log(
    `[pipeline] ▶ start  date=${toIsoDate(date)}  dryRun=${opts.dryRun ?? false}  skipIngest=${opts.skipIngest ?? false}  demo=${thresholds.demo}`,
  );
  if (thresholds.demo) {
    console.log(
      `[pipeline] ⚠ DEMO MODE — relaxed preview thresholds (article≥${thresholds.minArticleScore} delivery≥${thresholds.minDeliveryScore} summary≥${thresholds.minSummaryConfidence}). Production thresholds unchanged. Not production-ready output.`,
    );
  }

  // 1. Ingest
  const ingested = opts.skipIngest
    ? []
    : await ingestCandidates(date, ingestionSources);
  console.log(`[pipeline] · ingested ${ingested.length} new article(s)`);

  // 2. Extract + score every PENDING article (incl. those from prior runs).
  const extraction = opts.skipIngest
    ? { total: 0, scored: 0, rejected: 0, failed: 0 }
    : await extractAndScorePendingArticles();
  console.log(
    `[pipeline] · extract+score  total=${extraction.total} scored=${extraction.scored} rejected=${extraction.rejected} failed=${extraction.failed}`,
  );

  // 3. Topic picks
  const picks = await selectTopicDailyPicks(date, thresholds.minArticleScore);
  console.log(`[pipeline] · created ${picks.length} TopicDailyPick(s)`);

  // 4-6. Fan-out + send
  if (opts.dryRun) {
    await resetDryRunSends(date);
  }
  const sends = await fanOutAndSend(date, {
    summaryProvider:
      opts.summaryProvider ??
      defaultSummaryProvider({ minConfidence: thresholds.minSummaryConfidence }),
    dryRun: opts.dryRun ?? false,
    minDeliveryScore: thresholds.minDeliveryScore,
    send: opts.send,
    requireApproval: opts.requireApproval ?? isApprovalRequired(),
    pickId: opts.pickId,
  });

  // Source observability — fetch the rows we just touched.
  const sourceRows = await prisma.source.findMany({
    where: { active: true },
    select: { slug: true, lastError: true, lastFetchedAt: true },
  });
  const sourceErrors = sourceRows
    .filter((s) => !!s.lastError)
    .map((s) => ({ slug: s.slug, error: s.lastError as string }));

  // Summary counts for today.
  const todaysSummaries = await prisma.summary.findMany({
    where: { pick: { date } },
    select: { status: true },
  });
  const summaries = {
    ready: todaysSummaries.filter((s) => s.status === "READY").length,
    rejected: todaysSummaries.filter((s) => s.status === "REJECTED").length,
  };

  // Testing aids: how many demo/manual candidates are in the pool.
  const manualOrDemoArticles = await prisma.article.count({
    where: { tags: { hasSome: ["demo", "manual"] } },
  });
  const manualOrDemoPicks = await prisma.topicDailyPick.count({
    where: {
      date,
      article: {
        OR: [
          { sourceName: "OneRead Demo" },
          { tags: { hasSome: ["demo", "manual"] } },
        ],
      },
    },
  });

  // Subscriber delivery diagnostics — who got mapped, who was skipped & why.
  const subscribers = await computeSubscriberDiagnostics(date, picks.length);

  const result: PipelineResult = {
    date: toIsoDate(date),
    ingested: ingested.length,
    sources: {
      attempted: sourceRows.length,
      failed: sourceErrors.length,
      errors: sourceErrors.slice(0, 10),
    },
    extraction,
    manualOrDemoArticles,
    manualOrDemoPicks,
    picks: picks.length,
    summaries,
    sends,
    subscribers,
    demo: {
      enabled: thresholds.demo,
      thresholdsUsed: {
        minArticleScore: thresholds.minArticleScore,
        minDeliveryScore: thresholds.minDeliveryScore,
        minSummaryConfidence: thresholds.minSummaryConfidence,
      },
      productionThresholds: {
        minArticleScore: MIN_ARTICLE_SCORE,
        minDeliveryScore: MIN_DELIVERY_SCORE,
        minSummaryConfidence: MIN_SUMMARY_CONFIDENCE,
      },
    },
    durationMs: Date.now() - t0,
  };

  printPipelineSummary(result);
  return result;
}

async function resetDryRunSends(date: Date): Promise<void> {
  await prisma.dailySend.updateMany({
    where: {
      date,
      status: "SKIPPED",
      error: "dry-run",
    },
    data: {
      status: "QUEUED",
      error: null,
    },
  });
}

/**
 * Coarse per-subscriber delivery diagnostics for the dry-run output.
 * ACTIVE subscribers without a DailySend today are reported as skipped with
 * a best-effort reason. Unsubscribed/paused users are excluded by design.
 */
async function computeSubscriberDiagnostics(
  date: Date,
  pickCount: number,
): Promise<PipelineResult["subscribers"]> {
  const day = atUtcMidnight(date);
  const eligibility = await getOneArticleEligibilityByEmail();
  const active = (
    await prisma.subscriber.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, email: true },
    })
  ).filter((s) => eligibility.get(s.email)?.allowed === true);
  const sends = await prisma.dailySend.findMany({
    where: { date: day },
    select: { subscriberId: true },
  });
  const mappedIds = new Set(sends.map((s) => s.subscriberId));

  const skippedReasons: { email: string; reason: string }[] = [];
  for (const sub of active) {
    if (mappedIds.has(sub.id)) continue;
    const reason =
      pickCount === 0
        ? "no topic picks available today"
        : "no pick matched interests or cleared the delivery threshold";
    skippedReasons.push({ email: sub.email, reason });
  }

  return {
    // "active" now means eligible (valid trial/paid window + opted in), the
    // real denominator for delivery. Trial-expired / past-due / unsubscribed
    // are excluded by the eligibility gate, not counted as skips.
    active: active.length,
    mapped: active.filter((s) => mappedIds.has(s.id)).length,
    skipped: skippedReasons.length,
    skippedReasons: skippedReasons.slice(0, 20),
  };
}

function printPipelineSummary(r: PipelineResult): void {
  const lines = [
    "",
    `[pipeline] ──────── summary  date=${r.date}  ${r.durationMs}ms ────────`,
    r.demo.enabled
      ? `[pipeline]  mode           DEMO (preview thresholds article≥${r.demo.thresholdsUsed.minArticleScore} delivery≥${r.demo.thresholdsUsed.minDeliveryScore} summary≥${r.demo.thresholdsUsed.minSummaryConfidence}) · production thresholds UNCHANGED (article≥${r.demo.productionThresholds.minArticleScore} delivery≥${r.demo.productionThresholds.minDeliveryScore} summary≥${r.demo.productionThresholds.minSummaryConfidence})`
      : `[pipeline]  mode           production thresholds (article≥${r.demo.productionThresholds.minArticleScore} delivery≥${r.demo.productionThresholds.minDeliveryScore} summary≥${r.demo.productionThresholds.minSummaryConfidence})`,
    `[pipeline]  sources        attempted=${r.sources.attempted}  failed=${r.sources.failed}`,
    `[pipeline]  ingest         new articles=${r.ingested}  (demo/manual in pool=${r.manualOrDemoArticles})`,
    `[pipeline]  extract+score  total=${r.extraction.total}  scored=${r.extraction.scored}  rejected=${r.extraction.rejected}  failed=${r.extraction.failed}`,
    `[pipeline]  picks          created=${r.picks}  demo/manual today=${r.manualOrDemoPicks}`,
    `[pipeline]  summaries      ready=${r.summaries.ready}  rejected=${r.summaries.rejected}`,
    `[pipeline]  subscribers    active=${r.subscribers.active}  mapped=${r.subscribers.mapped}  skipped=${r.subscribers.skipped}`,
    `[pipeline]  sends          total=${r.sends.total}  sent=${r.sends.sent}  skipped=${r.sends.skipped}  failed=${r.sends.failed}`,
  ];
  if (r.sources.errors.length > 0) {
    lines.push(`[pipeline]  source errors:`);
    for (const e of r.sources.errors) {
      lines.push(`[pipeline]    · ${e.slug}: ${e.error.slice(0, 140)}`);
    }
  }
  if (r.subscribers.skippedReasons.length > 0) {
    lines.push(`[pipeline]  skipped subscribers:`);
    for (const s of r.subscribers.skippedReasons) {
      lines.push(`[pipeline]    · ${s.email}: ${s.reason}`);
    }
  }
  lines.push(`[pipeline] ─────────────────────────────────────────────`);
  console.log(lines.join("\n"));
}

/* ----------------------------------------------------------------------- */
/* Step 2 — Topic daily picks                                              */
/* ----------------------------------------------------------------------- */

/**
 * For each (top-level topic, source language) pair, select the single best
 * Article ingested in the last 48h that clears `MIN_TOPIC_PICK_QUALITY`.
 *
 * Already-existing picks for the same (date, topic, sourceLanguage) are
 * left untouched — re-running the pipeline is a no-op for those slots.
 *
 * Quality is more important than coverage. We never insert a pick we
 * wouldn't be proud to send.
 */
export async function selectTopicDailyPicks(
  date: Date,
  minArticleScore: number = MIN_ARTICLE_SCORE,
): Promise<TopicDailyPick[]> {
  const day = atUtcMidnight(date);

  // Existing picks for today — used to avoid re-doing finished slots.
  const existing = await prisma.topicDailyPick.findMany({
    where: { date: day },
    select: { topic: true, sourceLanguage: true },
  });
  const existingKeys = new Set(
    existing.map((p) => `${p.topic}::${p.sourceLanguage}`),
  );

  // Candidate window: ingested in the last 48h, scored, above the bar.
  const since = new Date(day.getTime() - 48 * 60 * 60 * 1000);
  const candidates = await prisma.article.findMany({
    where: {
      ingestedAt: { gte: since },
      scoringStatus: "SCORED",
      qualityScore: { gte: minArticleScore },
    },
  });

  // Group by (topic, sourceLanguage) and pick the highest scorer per slot.
  type Bucket = { topic: TopicSlug; sourceLanguage: string; best: Article };
  const buckets = new Map<string, Bucket>();
  for (const a of candidates) {
    if (!ALL_TOPIC_SLUGS.includes(a.topic)) continue;
    const key = `${a.topic}::${a.sourceLanguage}`;
    if (existingKeys.has(key)) continue;
    const aRank = articleRank(a);
    const cur = buckets.get(key);
    if (!cur || aRank > articleRank(cur.best)) {
      buckets.set(key, {
        topic: a.topic as TopicSlug,
        sourceLanguage: a.sourceLanguage,
        best: a,
      });
    }
  }

  const created: TopicDailyPick[] = [];
  for (const { topic, sourceLanguage, best } of buckets.values()) {
    const pick = await prisma.topicDailyPick.create({
      data: {
        date: day,
        topic,
        subtopics: best.subtopics,
        sourceLanguage,
        articleId: best.id,
        articleTitle: best.title,
        sourceName: best.sourceName,
        score: round3(articleRank(best)),
        reasonForSelection: best.reasonForSelection ?? null,
        status: "READY",
      },
    });
    created.push(pick);
  }

  return created;
}

/**
 * Force-create a preview TopicDailyPick for a single article — a safe,
 * development-only way to render the full email for a demo/manual article
 * that may not clear the production quality bar.
 *
 * Guarded: returns null in production or when demo mode is off. Never sends
 * email. Idempotent per (date, topic, sourceLanguage) slot.
 */
export async function createPreviewPick(
  articleId: string,
  opts: { demo?: boolean } = {},
): Promise<{ pick: TopicDailyPick | null; reason?: string }> {
  if (process.env.NODE_ENV === "production") {
    return { pick: null, reason: "preview picks are disabled in production" };
  }
  // Allow when explicitly dev (NODE_ENV !== production) — demo flag optional.
  if (opts.demo === false && !isDemoModeEnabled()) {
    // Still allowed in plain dev; demo flag just relaxes thresholds elsewhere.
  }

  const article = await prisma.article.findUnique({ where: { id: articleId } });
  if (!article) return { pick: null, reason: "article not found" };
  const isPreviewArticle =
    article.sourceName === "OneRead Demo" ||
    article.tags.includes("demo") ||
    article.tags.includes("manual");
  if (!isPreviewArticle) {
    return {
      pick: null,
      reason: "preview picks are only allowed for demo/manual articles",
    };
  }

  const day = atUtcMidnight(new Date());

  const existing = await prisma.topicDailyPick.findUnique({
    where: {
      date_topic_sourceLanguage: {
        date: day,
        topic: article.topic,
        sourceLanguage: article.sourceLanguage,
      },
    },
  });
  if (existing) {
    // Repoint the slot to this article so the admin can preview it.
    const pick = await prisma.topicDailyPick.update({
      where: { id: existing.id },
      data: {
        articleId: article.id,
        articleTitle: article.title,
        sourceName: article.sourceName,
        subtopics: article.subtopics,
        score: round3(articleRank(article)),
        reasonForSelection:
          article.reasonForSelection ?? "Preview pick (dev/demo).",
        status: "READY",
      },
    });
    return { pick };
  }

  const pick = await prisma.topicDailyPick.create({
    data: {
      date: day,
      topic: article.topic,
      subtopics: article.subtopics,
      sourceLanguage: article.sourceLanguage,
      articleId: article.id,
      articleTitle: article.title,
      sourceName: article.sourceName,
      score: round3(articleRank(article)),
      reasonForSelection:
        article.reasonForSelection ?? "Preview pick (dev/demo).",
      status: "READY",
    },
  });
  return { pick };
}

/**
 * Combined ranking of an Article used during picking. Equally weights
 * quality, usefulness, and morning-read suitability.
 */
function articleRank(a: Article): number {
  return (
    0.5 * (a.qualityScore ?? 0) +
    0.3 * (a.usefulnessScore ?? 0) +
    0.2 * (a.morningReadScore ?? 0)
  );
}

/* ----------------------------------------------------------------------- */
/* Step 3 — Per-subscriber selection (segment-aware)                       */
/* ----------------------------------------------------------------------- */

/**
 * For every ACTIVE subscriber, choose the best `TopicDailyPick` and write
 * a `DailySend`. Idempotent on (date, subscriberId).
 */
export async function selectSubscriberSends(
  date: Date,
  minDeliveryScore: number = MIN_DELIVERY_SCORE,
  opts: { requireApproval?: boolean; pickId?: string } = {},
): Promise<DailySend[]> {
  const day = atUtcMidnight(date);

  // Admin approval gate. When enabled (explicitly, or via the
  // ONE_ARTICLE_REQUIRE_APPROVAL env flag), only issues an admin has approved
  // or scheduled are eligible to send. Set ONE_ARTICLE_REQUIRE_APPROVAL=false
  // to allow any READY/SENT pick to be sent.
  const requireApproval = opts.requireApproval ?? isApprovalRequired();
  const picks = await prisma.topicDailyPick.findMany({
    where: {
      ...(opts.pickId ? { id: opts.pickId } : {}),
      date: day,
      status: { in: ["READY", "SENT"] },
      ...(requireApproval
        ? { approvalStatus: { in: [...SENDABLE_APPROVAL_STATUSES] } }
        : {}),
    },
    include: { article: true },
  });
  if (picks.length === 0) return [];

  // Quick lookup tables.
  const picksByTopic = groupBy(picks, (p) => p.topic);

  // Eligibility gate (single source of truth, new model): only subscribers
  // whose One Article subscription is in a valid trial/paid window and still
  // opted in to email get a send. We pre-filter the legacy rows by ACTIVE to
  // keep the query cheap, then drop anyone the eligibility map rejects.
  const eligibility = await getOneArticleEligibilityByEmail();
  const subscribers = (
    await prisma.subscriber.findMany({ where: { status: "ACTIVE" } })
  ).filter((s) => eligibility.get(s.email)?.allowed === true);

  const created: DailySend[] = [];

  for (const sub of subscribers) {
    // Skip if already chosen for today.
    const existing = await prisma.dailySend.findUnique({
      where: { date_subscriberId: { date: day, subscriberId: sub.id } },
    });
    if (existing) continue;

    const ctx = subscriberToContext(sub);

    // Build candidate list: picks whose topic is in the user's interest set,
    // plus any pick whose subtopic overlaps the user's interest slugs.
    const userTopics = new Set([
      ...(ctx.primaryInterest ? [ctx.primaryInterest] : []),
      ...ctx.secondaryInterests,
    ]);

    type PickWithArticle = TopicDailyPick & { article: Article | null };
    const candidates: PickWithArticle[] = [];
    for (const t of userTopics) {
      const arr = picksByTopic.get(t) as PickWithArticle[] | undefined;
      if (arr) candidates.push(...arr);
    }
    // Subtopic crossover.
    for (const p of picks as PickWithArticle[]) {
      if (candidates.includes(p)) continue;
      if (p.subtopics.some((s) => userTopics.has(s))) candidates.push(p);
    }

    // Score every candidate using the *real* underlying article scores so
    // personalization weights apply correctly (article quality vs.
    // usefulness vs. morning-fit are weighted differently downstream).
    const scored = candidates
        .map((pick) => ({
        pick,
        breakdown: scorePick(
          {
            topic: pick.topic as TopicSlug,
            subtopics: pick.subtopics,
            sourceLanguage: pick.sourceLanguage,
            sourceName: pick.sourceName,
            qualityScore: pick.article?.qualityScore ?? pick.score,
            usefulnessScore: pick.article?.usefulnessScore ?? pick.score,
            morningReadScore: pick.article?.morningReadScore ?? pick.score,
          },
          ctx,
        ),
      }))
      .sort((a, b) => b.breakdown.total - a.breakdown.total);

    // Quality gate: don't send below threshold.
    const winner = scored[0];
    if (!winner || winner.breakdown.total < minDeliveryScore) {
      continue; // skip — better silence than mediocre.
    }

    const matched = matchedTopicFor(
      {
        topic: winner.pick.topic as TopicSlug,
        subtopics: winner.pick.subtopics,
        sourceLanguage: winner.pick.sourceLanguage,
        sourceName: winner.pick.sourceName,
          qualityScore: winner.pick.article?.qualityScore ?? winner.pick.score,
          usefulnessScore: winner.pick.article?.usefulnessScore ?? winner.pick.score,
          morningReadScore: winner.pick.article?.morningReadScore ?? winner.pick.score,
      },
      ctx,
    );

    const send = await prisma.dailySend.create({
      data: {
        date: day,
        subscriberId: sub.id,
        topicDailyPickId: winner.pick.id,
        summaryLanguage: sub.summaryLanguage ?? "English",
        matchedTopic: matched,
        personalizedScore: winner.breakdown.total,
        status: "QUEUED",
      },
    });
    created.push(send);
  }

  return created;
}

/* ----------------------------------------------------------------------- */
/* Steps 4-5 — Render + send                                               */
/* ----------------------------------------------------------------------- */

interface FanOutOpts {
  summaryProvider: SummaryProvider;
  dryRun: boolean;
  minDeliveryScore?: number;
  send?: (args: SendArgs) => Promise<{ messageId?: string }>;
  requireApproval?: boolean;
  pickId?: string;
}

async function fanOutAndSend(
  date: Date,
  opts: FanOutOpts,
): Promise<{ total: number; sent: number; skipped: number; failed: number }> {
  // Make sure DailySend rows exist before sending.
  await selectSubscriberSends(date, opts.minDeliveryScore, {
    requireApproval: opts.requireApproval,
    pickId: opts.pickId,
  });

  const day = atUtcMidnight(date);
  const queued = await prisma.dailySend.findMany({
    where: {
      date: day,
      status: "QUEUED",
      ...(opts.pickId ? { topicDailyPickId: opts.pickId } : {}),
    },
    include: {
      subscriber: true,
      pick: { include: { article: true } },
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const send of queued) {
    try {
      const sub = send.subscriber;
      const pick = send.pick;
      const summary = pick.article
        ? await getOrCreateSummary(
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
              summaryLanguage: send.summaryLanguage,
              primaryTopic: send.matchedTopic,
              difficulty: sub.preferredDifficulty || "mixed",
            },
            opts.summaryProvider,
          )
        : await loadManualSummaryForSend(pick.id, send.summaryLanguage, send.matchedTopic, sub.preferredDifficulty || "mixed");

      // Editorial bar: never send a low-confidence summary. Mark the
      // DailySend as SKIPPED with the rejection reason so we can debug.
      if (summary.status !== "READY") {
        await prisma.dailySend.update({
          where: { id: send.id },
          data: {
            status: "SKIPPED",
            error:
              summary.rejectionReason ?? "summary not READY",
          },
        });
        skipped++;
        continue;
      }

      const ctx = subscriberToContext(sub);
      const interestCount =
        (ctx.primaryInterest ? 1 : 0) + ctx.secondaryInterests.length;

      const links = buildEmailLinks(send.id);

      const rendered = renderDailyEmail({
        date: toIsoDate(day),
        matchedTopic: send.matchedTopic,
        hasMultipleInterests: interestCount > 1,
        summaryLanguage: send.summaryLanguage,
        article: {
          title: pick.articleTitle,
          url: pick.article?.url ?? null,
          sourceName: pick.sourceName,
        },
        summary: {
          bodyText: summary.bodyText,
          bodyHtml: summary.bodyHtml,
          structured: summary.structured,
        },
        links,
      });

      if (opts.dryRun || !opts.send) {
        await prisma.dailySend.update({
          where: { id: send.id },
          data: { status: "SKIPPED", error: "dry-run" },
        });
        skipped++;
        continue;
      }

      const { messageId } = await opts.send({
        to: sub.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });

      await prisma.$transaction([
        prisma.dailySend.update({
          where: { id: send.id },
          data: {
            status: "SENT",
            emailMessageId: messageId ?? null,
            sentAt: new Date(),
          },
        }),
        prisma.topicDailyPick.update({
          where: { id: pick.id },
          data: { status: "SENT" },
        }),
        prisma.subscriber.update({
          where: { id: sub.id },
          data: {
            lastSentAt: new Date(),
            recentlySentTopics: trimList(
              [send.matchedTopic, ...sub.recentlySentTopics],
              7,
            ),
            recentlySentArticleIds: trimList(
              [pick.articleId, ...sub.recentlySentArticleIds].filter((id): id is string => Boolean(id)),
              30,
            ),
          },
        }),
      ]);

      sent++;
    } catch (err) {
      console.error("[pipeline] send failed:", err);
      await prisma.dailySend.update({
        where: { id: send.id },
        data: {
          status: "FAILED",
          error: err instanceof Error ? err.message : "unknown",
        },
      });
      failed++;
    }
  }

  return { total: queued.length, sent, skipped, failed };
}

async function loadManualSummaryForSend(
  pickId: string,
  summaryLanguage: string,
  primaryTopic: string,
  difficulty: string,
): Promise<SummaryResult> {
  const exact = await prisma.summary.findUnique({
    where: {
      topicDailyPickId_summaryLanguage_primaryTopic_difficulty: {
        topicDailyPickId: pickId,
        summaryLanguage,
        primaryTopic,
        difficulty,
      },
    },
  });
  const fallback =
    exact ??
    (await prisma.summary.findFirst({
      where: { topicDailyPickId: pickId, summaryLanguage },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.summary.findFirst({
      where: { topicDailyPickId: pickId },
      orderBy: { createdAt: "desc" },
    }));

  if (!fallback) {
    return {
      bodyText: "",
      status: "REJECTED",
      rejectionReason: "manual issue has no summary content",
      generator: "manual",
    };
  }
  return summaryResultFromRow(fallback);
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

export function subscriberToContext(s: Subscriber): SubscriberContext {
  return {
    primaryInterest: (s.primaryInterest as TopicSlug | null) ?? null,
    secondaryInterests: (s.secondaryInterests as TopicSlug[]) ?? [],
    sourceLanguage: s.sourceLanguage ?? null,
    recentlySentTopics: (s.recentlySentTopics as TopicSlug[]) ?? [],
    feedbackProfile: (s.feedbackProfile as unknown as
      | SubscriberContext["feedbackProfile"]
      | null) ?? null,
  };
}

function buildEmailLinks(sendId: string): {
  feedbackLoved: string;
  feedbackLiked: string;
  feedbackMeh: string;
  feedbackDisliked: string;
  unsubscribe: string;
} {
  const base =
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://oneread.app";
  const fb = (r: string) =>
    `${base}/api/feedback?send=${encodeURIComponent(sendId)}&r=${r}`;
  return {
    feedbackLoved: fb("loved"),
    feedbackLiked: fb("liked"),
    feedbackMeh: fb("meh"),
    feedbackDisliked: fb("disliked"),
    unsubscribe: `${base}/unsubscribe?send=${encodeURIComponent(sendId)}`,
  };
}

function atUtcMidnight(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function groupBy<T, K>(arr: readonly T[], key: (t: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const item of arr) {
    const k = key(item);
    const list = m.get(k);
    if (list) list.push(item);
    else m.set(k, [item]);
  }
  return m;
}

function trimList(list: readonly string[], n: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= n) break;
  }
  return out;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Re-export for convenience.
export type { ScoreBreakdown };
