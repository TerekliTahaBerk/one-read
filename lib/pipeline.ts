/**
 * One Read — daily editorial pipeline.
 *
 * High-level flow (one calendar day, UTC):
 *   1. Ingest candidate articles.
 *   2. For each (topic, sourceLanguage), select the single best article
 *      that clears the quality threshold → write a `TopicDailyPick`.
 *   3. For each ACTIVE subscriber, score every relevant pick and choose
 *      the best one → write a `DailySend`.
 *   4. Generate (or reuse) the summary in their summary language.
 *   5. Send via Resend, mark `DailySend.status = "SENT"`.
 *
 * Steps 1-3 are pure orchestration over Prisma, fully testable from a
 * cron handler. Step 4 lives behind the `SummaryProvider` interface so we
 * can swap in an LLM later without touching this file.
 *
 * Idempotency: every step is keyed by `(date, …)` unique constraints, so
 * the cron can safely retry without duplicating sends.
 */

import { prisma } from "./prisma";
import { ALL_TOPIC_SLUGS, type TopicSlug } from "./topics";
import {
  MIN_DELIVERY_SCORE,
  MIN_TOPIC_PICK_QUALITY,
  matchedTopicFor,
  scorePick,
  type ScoreBreakdown,
  type SubscriberContext,
} from "./personalization";
import { getOrCreateSummary, heuristicSummaryProvider, type SummaryProvider } from "./summarizer";
import { renderDailyEmail } from "./email-template";
import { ingestCandidates, type IngestionSource } from "./ingest";
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
  /** Optional ingestion sources. Defaults to no-op. */
  ingestionSources?: readonly IngestionSource[];
  /** Optional LLM/heuristic summary provider. Defaults to heuristic. */
  summaryProvider?: SummaryProvider;
  /** If true, generate sends but do not actually email. */
  dryRun?: boolean;
  /** Hook used by the email step. */
  send?: (args: SendArgs) => Promise<{ messageId?: string }>;
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
  picks: number;
  sends: { total: number; sent: number; skipped: number; failed: number };
}

/**
 * End-to-end orchestration. Safe to call multiple times for the same date.
 */
export async function runDailyPipeline(
  opts: DailyPipelineOptions = {},
): Promise<PipelineResult> {
  const date = atUtcMidnight(opts.date ?? new Date());
  const ingestionSources = opts.ingestionSources ?? [];

  // 1. Ingest
  const ingested = await ingestCandidates(date, ingestionSources);

  // 2. Topic picks
  const picks = await selectTopicDailyPicks(date);

  // 3-5. Fan-out + send
  const sends = await fanOutAndSend(date, {
    summaryProvider: opts.summaryProvider ?? heuristicSummaryProvider,
    dryRun: opts.dryRun ?? false,
    send: opts.send,
  });

  return {
    date: toIsoDate(date),
    ingested: ingested.length,
    picks: picks.length,
    sends,
  };
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

  // Candidate window: ingested in the last 48h.
  const since = new Date(day.getTime() - 48 * 60 * 60 * 1000);
  const candidates = await prisma.article.findMany({
    where: {
      ingestedAt: { gte: since },
      qualityScore: { gte: MIN_TOPIC_PICK_QUALITY },
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
export async function selectSubscriberSends(date: Date): Promise<DailySend[]> {
  const day = atUtcMidnight(date);

  const picks = await prisma.topicDailyPick.findMany({
    where: { date: day, status: { in: ["READY", "SENT"] } },
  });
  if (picks.length === 0) return [];

  // Quick lookup tables.
  const picksByTopic = groupBy(picks, (p) => p.topic);

  const subscribers = await prisma.subscriber.findMany({
    where: { status: "ACTIVE" },
  });

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

    const candidates: TopicDailyPick[] = [];
    for (const t of userTopics) {
      const arr = picksByTopic.get(t);
      if (arr) candidates.push(...arr);
    }
    // Subtopic crossover.
    for (const p of picks) {
      if (candidates.includes(p)) continue;
      if (p.subtopics.some((s) => userTopics.has(s))) candidates.push(p);
    }

    // Score every candidate.
    const scored = candidates
      .map((pick) => ({
        pick,
        breakdown: scorePick(
          {
            topic: pick.topic as TopicSlug,
            subtopics: pick.subtopics,
            sourceLanguage: pick.sourceLanguage,
            sourceName: pick.sourceName,
            qualityScore: pick.score, // pick.score already encodes article quality
            usefulnessScore: pick.score,
            morningReadScore: pick.score,
          },
          ctx,
        ),
      }))
      .sort((a, b) => b.breakdown.total - a.breakdown.total);

    // Quality gate: don't send below threshold.
    const winner = scored[0];
    if (!winner || winner.breakdown.total < MIN_DELIVERY_SCORE) {
      continue; // skip — better silence than mediocre.
    }

    const matched = matchedTopicFor(
      {
        topic: winner.pick.topic as TopicSlug,
        subtopics: winner.pick.subtopics,
        sourceLanguage: winner.pick.sourceLanguage,
        sourceName: winner.pick.sourceName,
        qualityScore: winner.pick.score,
        usefulnessScore: winner.pick.score,
        morningReadScore: winner.pick.score,
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
  send?: (args: SendArgs) => Promise<{ messageId?: string }>;
}

async function fanOutAndSend(
  date: Date,
  opts: FanOutOpts,
): Promise<{ total: number; sent: number; skipped: number; failed: number }> {
  // Make sure DailySend rows exist before sending.
  await selectSubscriberSends(date);

  const day = atUtcMidnight(date);
  const queued = await prisma.dailySend.findMany({
    where: { date: day, status: "QUEUED" },
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
            sourceLanguage: pick.article.sourceLanguage,
            sourceName: pick.article.sourceName,
          },
          summaryLanguage: send.summaryLanguage,
          primaryTopic: send.matchedTopic,
          difficulty: sub.preferredDifficulty || "mixed",
        },
        opts.summaryProvider,
      );

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
          url: pick.article.url,
          sourceName: pick.sourceName,
        },
        summary,
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
              [pick.articleId, ...sub.recentlySentArticleIds],
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

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

export function subscriberToContext(s: Subscriber): SubscriberContext {
  return {
    primaryInterest: (s.primaryInterest as TopicSlug | null) ?? null,
    secondaryInterests: (s.secondaryInterests as TopicSlug[]) ?? [],
    sourceLanguage:
      (s.sourceLanguage as "English" | "Turkish" | "Any" | null) ?? null,
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
