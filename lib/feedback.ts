/**
 * OneRead — feedback profile updater.
 *
 * Translates a Feedback row into nudges on the Subscriber.feedbackProfile
 * JSON. Topic and source affinities live in [-1, 1] and decay slowly
 * toward 0 as new feedback arrives, so a single bad day doesn't kill a
 * topic forever.
 */

import { prisma } from "./prisma";
import type { FeedbackProfile } from "./personalization";

export type Reaction = "loved" | "liked" | "meh" | "disliked";

export const REACTIONS: readonly Reaction[] = [
  "loved",
  "liked",
  "meh",
  "disliked",
] as const;

const REACTION_DELTA: Record<Reaction, number> = {
  loved: 0.4,
  liked: 0.2,
  meh: -0.1,
  disliked: -0.4,
};

/** Each existing affinity decays toward 0 by this fraction on update. */
const DECAY = 0.05;

/**
 * Apply a reaction to the subscriber's feedbackProfile and persist.
 */
export async function recordFeedback(args: {
  subscriberId: string;
  reaction: Reaction;
  topic?: string | null;
  sourceName?: string | null;
  articleId?: string | null;
}): Promise<void> {
  const { subscriberId, reaction, topic, sourceName, articleId } = args;

  const subscriber = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: { feedbackProfile: true },
  });
  if (!subscriber) return;

  const current = (subscriber.feedbackProfile as unknown) as
    | FeedbackProfile
    | null
    | undefined;
  const next = applyReaction(current, reaction, { topic, sourceName });

  await prisma.$transaction([
    prisma.feedback.create({
      data: {
        subscriberId,
        reaction,
        topic: topic ?? null,
        sourceName: sourceName ?? null,
        articleId: articleId ?? null,
      },
    }),
    prisma.subscriber.update({
      where: { id: subscriberId },
      data: {
        feedbackProfile: next as unknown as object,
      },
    }),
  ]);
}

/**
 * Pure function: derive the next FeedbackProfile from the current one
 * and a reaction. Exported for testing.
 */
export function applyReaction(
  current: FeedbackProfile | null | undefined,
  reaction: Reaction,
  ctx: { topic?: string | null; sourceName?: string | null },
): FeedbackProfile {
  const delta = REACTION_DELTA[reaction];

  const topicAffinity = decayMap(current?.topicAffinity);
  const sourceAffinity = decayMap(current?.sourceAffinity);

  if (ctx.topic) {
    topicAffinity[ctx.topic] = clampUnit(
      (topicAffinity[ctx.topic] ?? 0) + delta,
    );
  }
  if (ctx.sourceName) {
    sourceAffinity[ctx.sourceName] = clampUnit(
      (sourceAffinity[ctx.sourceName] ?? 0) + delta,
    );
  }

  return {
    topicAffinity,
    sourceAffinity,
    updatedAt: new Date().toISOString(),
  };
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function decayMap(
  m: Record<string, number> | undefined,
): Record<string, number> {
  if (!m) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(m)) {
    if (typeof v !== "number" || Number.isNaN(v)) continue;
    const decayed = v * (1 - DECAY);
    if (Math.abs(decayed) < 0.02) continue; // drop near-zero noise
    out[k] = round3(decayed);
  }
  return out;
}

function clampUnit(n: number): number {
  if (n < -1) return -1;
  if (n > 1) return 1;
  return round3(n);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
