/**
 * One Read — admin endpoint: send a test email to a single recipient.
 *
 * POST /api/admin/test-email
 * Body: {
 *   to: string,
 *   summaryLanguage?: "English" | "Turkish",
 *   topic?: <topic-slug>,
 *   difficulty?: "beginner" | "intermediate" | "advanced" | "mixed"
 * }
 * Auth: header "Authorization: Bearer ${ADMIN_TOKEN}"
 *
 * Generates a fresh One Read email for "today" (using whatever
 * TopicDailyPick the test recipient would receive — falling back to
 * the highest-scoring pick if no real send exists for this email)
 * and delivers via Resend. Does NOT mutate DailySend rows, so it can
 * be safely used to debug a live cron run without double-delivering.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderDailyEmail } from "@/lib/email-template";
import { getOrCreateSummary } from "@/lib/summarizer";
import { sendDailyEmail } from "@/lib/resend";
import { subscriberToContext } from "@/lib/pipeline";
import {
  parseSummaryLanguage,
  type SummaryLanguage,
} from "@/lib/options";
import { ALL_TOPIC_SLUGS } from "@/lib/topics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.ADMIN_TOKEN
    ? `Bearer ${process.env.ADMIN_TOKEN}`
    : "";
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    to?: string;
    summaryLanguage?: string;
    topic?: string;
    difficulty?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const to = (body.to ?? "").trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "invalid email" }, { status: 400 });
  }

  const overrideLang: SummaryLanguage | null = body.summaryLanguage
    ? parseSummaryLanguage(body.summaryLanguage)
    : null;
  const overrideTopic =
    typeof body.topic === "string" && ALL_TOPIC_SLUGS.includes(body.topic)
      ? body.topic
      : null;
  const overrideDifficulty =
    typeof body.difficulty === "string" &&
    ["beginner", "intermediate", "advanced", "mixed"].includes(
      body.difficulty,
    )
      ? body.difficulty
      : null;

  const day = atUtcMidnight(new Date());

  // If the caller asked for a specific topic, prefer that pick.
  const pick = await prisma.topicDailyPick.findFirst({
    where: {
      date: day,
      status: { in: ["READY", "SENT"] },
      ...(overrideTopic ? { topic: overrideTopic } : {}),
    },
    orderBy: { score: "desc" },
    include: { article: true },
  });

  if (!pick) {
    return NextResponse.json(
      {
        error:
          "no TopicDailyPick available for today — run the pipeline first or drop the topic override",
      },
      { status: 409 },
    );
  }

  // Use the recipient's subscriber row if they have one, else defaults.
  const sub = await prisma.subscriber.findUnique({ where: { email: to } });
  const summaryLanguage =
    overrideLang ?? sub?.summaryLanguage ?? "English";
  const matchedTopic =
    overrideTopic ?? sub?.primaryInterest ?? pick.topic;
  const difficulty =
    overrideDifficulty ?? sub?.preferredDifficulty ?? "mixed";

  const summary = await getOrCreateSummary({
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
    summaryLanguage,
    primaryTopic: matchedTopic,
    difficulty,
  });

  if (summary.status !== "READY") {
    return NextResponse.json(
      {
        error: "summary not READY",
        rejectionReason: summary.rejectionReason,
        confidence: summary.confidence,
        generator: summary.generator,
      },
      { status: 409 },
    );
  }

  const ctx = sub
    ? subscriberToContext(sub)
    : {
        primaryInterest: matchedTopic as never,
        secondaryInterests: [] as never,
        sourceLanguage: null as never,
        recentlySentTopics: [] as never,
        feedbackProfile: null,
      };
  const interestCount =
    (ctx.primaryInterest ? 1 : 0) + ctx.secondaryInterests.length;

  const links = buildPreviewLinks(to);
  const rendered = renderDailyEmail({
    date: day.toISOString().slice(0, 10),
    matchedTopic,
    hasMultipleInterests: interestCount > 1,
    summaryLanguage,
    article: {
      title: pick.articleTitle,
      url: pick.article.url,
      sourceName: pick.sourceName,
    },
    summary: {
      bodyText: summary.bodyText,
      bodyHtml: summary.bodyHtml,
      structured: summary.structured,
    },
    links,
  });

  try {
    const { messageId } = await sendDailyEmail({
      to,
      subject: `[Test] ${rendered.subject}`,
      text: rendered.text,
      html: rendered.html,
    });
    return NextResponse.json({
      ok: true,
      messageId,
      summary: {
        confidence: summary.confidence,
        generator: summary.generator,
        status: summary.status,
      },
      pick: {
        id: pick.id,
        topic: pick.topic,
        article: { title: pick.articleTitle, url: pick.article.url },
      },
      overrides: {
        summaryLanguage: overrideLang,
        topic: overrideTopic,
        difficulty: overrideDifficulty,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "send failed" },
      { status: 500 },
    );
  }
}

function atUtcMidnight(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function buildPreviewLinks(to: string) {
  const base =
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://oneread.app";
  return {
    feedbackLoved: `${base}/api/feedback?preview=1&r=loved&to=${encodeURIComponent(to)}`,
    feedbackLiked: `${base}/api/feedback?preview=1&r=liked&to=${encodeURIComponent(to)}`,
    feedbackMeh: `${base}/api/feedback?preview=1&r=meh&to=${encodeURIComponent(to)}`,
    feedbackDisliked: `${base}/api/feedback?preview=1&r=disliked&to=${encodeURIComponent(to)}`,
    unsubscribe: `${base}/unsubscribe?preview=1&to=${encodeURIComponent(to)}`,
  };
}
