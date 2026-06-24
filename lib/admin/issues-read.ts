import type { Article, Summary, TopicDailyPick } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { renderDailyEmail } from "@/lib/email-template";
import type { StructuredSummary } from "@/lib/llm";
import { effectiveStructuredSummary } from "@/lib/summarizer";
import { loadOneArticleSubs, type SubWithRels } from "@/lib/admin/queries";
import { evaluateEligibility } from "@/lib/subscriptions";
import { interestLabelsToSlugs } from "@/lib/topics";

/**
 * Read-only views over the editorial "issue" — which in OneRead is the existing
 * TopicDailyPick (one per date × topic × source language) plus its Summary rows
 * (one per summary language). This layer powers the admin issue list/detail and
 * the rendered email preview. It never sends anything.
 */

export type PickWithArticle = TopicDailyPick & { article: Article | null };

export interface IssueListItem {
  id: string;
  date: Date;
  topic: string;
  sourceLanguage: string;
  articleTitle: string;
  sourceName: string;
  status: string; // editorial
  approvalStatus: string;
  scheduledFor: Date | null;
  summaryLanguages: string[];
  /** Existing DailySend rows for this issue. Not a guessed recipient estimate. */
  recipientCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
}

/** Lists issues (picks) for a date with their approval + send rollups. */
export async function loadIssues(date: Date): Promise<IssueListItem[]> {
  const picks = await prisma.topicDailyPick.findMany({
    where: { date },
    include: {
      summaries: { select: { summaryLanguage: true } },
      sends: { select: { status: true } },
    },
    orderBy: [{ topic: "asc" }, { sourceLanguage: "asc" }],
  });

  return picks.map((p) => {
    const counts = { SENT: 0, QUEUED: 0, SKIPPED: 0, FAILED: 0 } as Record<string, number>;
    for (const s of p.sends) counts[s.status] = (counts[s.status] ?? 0) + 1;
    return {
      id: p.id,
      date: p.date,
      topic: p.topic,
      sourceLanguage: p.sourceLanguage,
      articleTitle: p.articleTitle,
      sourceName: p.sourceName,
      status: p.status,
      approvalStatus: p.approvalStatus,
      scheduledFor: p.scheduledFor,
      summaryLanguages: Array.from(new Set(p.summaries.map((s) => s.summaryLanguage))),
      recipientCount: p.sends.length,
      sentCount: counts.SENT,
      skippedCount: counts.SKIPPED,
      failedCount: counts.FAILED,
    };
  });
}

export interface RenderedPreview {
  summaryId: string;
  summaryLanguage: string;
  status: string;
  confidence: number | null;
  generator: string | null;
  rejectionReason: string | null;
  /** Editor / quality-gate notes (banned-phrase warnings, repair retries). */
  editorNotes: string | null;
  subjectOverride: string | null;
  previewTextOverride: string | null;
  bodyTextOverride: string | null;
  bodyHtmlOverride: string | null;
  bodyText: string;
  bodyHtml: string | null;
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export interface IssueRecipient {
  subscriptionId: string;
  email: string;
  summaryLanguage: string | null;
  interestsCount: number;
  eligible: boolean;
  reason: string;
  alreadySent: boolean;
}

export interface IssueDetail {
  pick: PickWithArticle;
  previews: RenderedPreview[];
  recipients: IssueRecipient[];
  matchingCount: number;
  eligibleCount: number;
  skippedCount: number;
  alreadySentCount: number;
}

function previewLinks() {
  const base =
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://oneread.app";
  return {
    feedbackLoved: `${base}/api/feedback?preview=1&r=loved`,
    feedbackLiked: `${base}/api/feedback?preview=1&r=liked`,
    feedbackMeh: `${base}/api/feedback?preview=1&r=meh`,
    feedbackDisliked: `${base}/api/feedback?preview=1&r=disliked`,
    unsubscribe: `${base}/unsubscribe?preview=1`,
  };
}

/** Renders the email for one summary, applying any admin subject/preview override. */
export function renderPreviewForSummary(
  pick: PickWithArticle,
  summary: Summary,
): RenderedPreview {
  const structuredRaw =
    (summary.structuredJson as unknown as StructuredSummary | null) ?? undefined;
  const structured = effectiveStructuredSummary(summary);

  const rendered = renderDailyEmail({
    date: pick.date.toISOString().slice(0, 10),
    matchedTopic: summary.primaryTopic,
    hasMultipleInterests: false,
    summaryLanguage: summary.summaryLanguage,
    article: {
      title: pick.articleTitle,
      url: pick.article?.url ?? null,
      sourceName: pick.sourceName,
    },
    summary: {
      bodyText: summary.bodyTextOverride?.trim() || summary.bodyText,
      bodyHtml: summary.bodyHtmlOverride?.trim() || summary.bodyHtml || undefined,
      structured,
    },
    links: previewLinks(),
  });

  return {
    summaryId: summary.id,
    summaryLanguage: summary.summaryLanguage,
    status: summary.status,
    confidence: summary.confidence,
    generator: summary.generator,
    rejectionReason: summary.rejectionReason,
    editorNotes: structuredRaw?.editorNotes ?? null,
    subjectOverride: summary.subjectOverride,
    previewTextOverride: summary.previewTextOverride,
    bodyTextOverride: summary.bodyTextOverride,
    bodyHtmlOverride: summary.bodyHtmlOverride,
    bodyText: summary.bodyText,
    bodyHtml: summary.bodyHtml,
    subject: rendered.subject,
    previewText: summary.previewTextOverride ?? structuredRaw?.preheader ?? "",
    html: rendered.html,
    text: rendered.text,
  };
}

/** True when a subscriber's interests overlap the pick's topic/subtopics. */
function subscriberMatchesPick(sub: SubWithRels, pick: PickWithArticle): boolean {
  const prefs = sub.preferences;
  if (!prefs) return false;
  const slugs = new Set([
    ...(prefs.primaryInterest ? [prefs.primaryInterest] : []),
    ...prefs.secondaryInterests,
    ...interestLabelsToSlugs(prefs.interests),
  ]);
  if (slugs.has(pick.topic)) return true;
  return pick.subtopics.some((s) => slugs.has(s));
}

export async function loadIssueDetail(id: string): Promise<IssueDetail | null> {
  const pick = await prisma.topicDailyPick.findUnique({
    where: { id },
    include: { article: true, summaries: true },
  });
  if (!pick) return null;

  const previews = pick.summaries
    .slice()
    .sort((a, b) => a.summaryLanguage.localeCompare(b.summaryLanguage))
    .map((s) => renderPreviewForSummary(pick, s));

  // Recipients: eligible OneArticle subscribers whose interests match this
  // segment. "Already sent" reflects an existing DailySend for this pick.
  const [subs, sendsForPick] = await Promise.all([
    loadOneArticleSubs(),
    prisma.dailySend.findMany({
      where: { topicDailyPickId: id },
      include: { subscriber: { select: { email: true } } },
    }),
  ]);
  const sentEmails = new Set(sendsForPick.map((s) => s.subscriber.email));

  const now = new Date();
  const recipients: IssueRecipient[] = [];
  for (const sub of subs) {
    if (!subscriberMatchesPick(sub, pick)) continue;
    const elig = evaluateEligibility(sub, now);
    recipients.push({
      subscriptionId: sub.id,
      email: sub.contact.email,
      summaryLanguage: sub.preferences?.summaryLanguage ?? null,
      interestsCount: sub.preferences?.interests.length ?? 0,
      eligible: elig.allowed,
      reason: elig.reason,
      alreadySent: sentEmails.has(sub.contact.email),
    });
  }
  recipients.sort((a, b) => Number(b.eligible) - Number(a.eligible));

  const eligibleCount = recipients.filter((r) => r.eligible).length;
  return {
    pick,
    previews,
    recipients,
    matchingCount: recipients.length,
    eligibleCount,
    skippedCount: recipients.length - eligibleCount,
    alreadySentCount: recipients.filter((r) => r.alreadySent).length,
  };
}
