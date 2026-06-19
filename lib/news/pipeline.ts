import { Prisma, type NewsDailyIssue, type NewsPreferences, type ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendDailyEmail } from "@/lib/resend";
import { ONE_NEWS_PRODUCT_KEY } from "@/lib/options";
import { newsRequireApproval } from "./config";
import { generateNewsIssue } from "./generator";
import { renderNewsEmail } from "./email-template";
import { evaluateNewsEligibility } from "./subscriptions";
import { loadNewsSourceStories, markStoriesUsed } from "./sources";
import { segmentFor, segmentKeyFor, type NewsSegment } from "./segments";

export interface OneNewsPipelineOptions {
  date?: Date;
  dryRun?: boolean;
  skipGeneration?: boolean;
  requireApproval?: boolean;
  segmentKey?: string;
  sendNow?: boolean;
  send?: (args: SendArgs) => Promise<{ messageId?: string }>;
}

export interface SendArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface OneNewsPipelineResult {
  date: string;
  segments: {
    total: number;
    generated: number;
    reused: number;
    notGenerated: number;
    noSources: number;
    skippedApproval: number;
  };
  subscribers: {
    total: number;
    eligible: number;
    skipped: number;
    skippedReasons: { email: string; reason: string }[];
  };
  sends: { total: number; sent: number; skipped: number; failed: number; dryRun: number };
  durationMs: number;
}

type NewsSubRow = ProductSubscription & {
  contact: { id: string; email: string };
  newsPreferences: NewsPreferences | null;
};

const SENDABLE_APPROVAL_STATUSES = new Set(["APPROVED", "SCHEDULED"]);

export async function runOneNewsDailyPipeline(
  opts: OneNewsPipelineOptions = {},
): Promise<OneNewsPipelineResult> {
  const t0 = Date.now();
  const date = atUtcMidnight(opts.date ?? new Date());
  const dateIso = toIsoDate(date);
  const dryRun = opts.dryRun ?? false;
  const requireApproval = opts.requireApproval ?? newsRequireApproval();
  const sender = opts.send ?? sendDailyEmail;

  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_NEWS_PRODUCT_KEY },
    include: {
      contact: { select: { id: true, email: true } },
      newsPreferences: true,
    },
  });

  const eligible: NewsSubRow[] = [];
  const skippedReasons: { email: string; reason: string }[] = [];
  for (const sub of subs) {
    const result = evaluateNewsEligibility(sub);
    if (result.allowed && sub.newsPreferences) eligible.push(sub);
    else skippedReasons.push({ email: sub.contact.email, reason: result.reason ?? "missing_news_preferences" });
  }

  const bySegment = new Map<string, NewsSubRow[]>();
  for (const sub of eligible) {
    const prefs = sub.newsPreferences;
    if (!prefs) continue;
    const key = segmentKeyFor(prefs);
    if (opts.segmentKey && key !== opts.segmentKey) continue;
    const rows = bySegment.get(key) ?? [];
    rows.push(sub);
    bySegment.set(key, rows);
  }

  let generated = 0;
  let reused = 0;
  let notGenerated = 0;
  let noSources = 0;
  let skippedApproval = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let dryRunCount = 0;

  for (const [key, rows] of bySegment.entries()) {
    const prefs = rows[0]?.newsPreferences;
    if (!prefs) continue;
    const seg = segmentFor(prefs);
    const issueResult = await ensureDailyIssue(date, key, seg, {
      skipGeneration: opts.skipGeneration ?? false,
      tone: prefs.tone,
      depth: prefs.depth,
    });
    const issue = issueResult.issue;

    if (issueResult.created) generated++;
    else reused++;
    if (issue.status === "NO_SOURCES") noSources++;
    if (issue.status !== "GENERATED") notGenerated++;

    const canSend =
      opts.sendNow === true ||
      !requireApproval ||
      SENDABLE_APPROVAL_STATUSES.has(issue.approvalStatus);

    if (!canSend || issue.status !== "GENERATED") {
      const reason =
        issue.status === "NO_SOURCES"
          ? "no_source_material"
          : issue.status !== "GENERATED"
            ? "issue_not_generated"
            : "approval_required";
      skippedApproval += rows.length;
      for (const sub of rows) await upsertSkippedSend(date, sub, issue, reason);
      skipped += rows.length;
      continue;
    }

    for (const sub of rows) {
      const existing = await prisma.newsDailySend.findUnique({
        where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
      });
      if (existing?.status === "SENT") {
        skipped++;
        continue;
      }

      const rendered = renderNewsEmail(issue, {
        date: dateIso,
        briefingLanguage: seg.briefingLanguage,
        regionFocus: seg.regionFocus,
        links: { unsubscribe: buildUnsubscribeLink(sub.unsubscribeToken) },
      });

      if (dryRun) {
        await upsertSkippedSend(date, sub, issue, "dry_run");
        dryRunCount++;
        continue;
      }

      try {
        const result = await sender({
          to: sub.contact.email,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        await prisma.newsDailySend.upsert({
          where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
          update: {
            newsDailyIssueId: issue.id,
            status: "SENT",
            sentAt: new Date(),
            skippedReason: null,
            failedReason: null,
            providerMessageId: result.messageId ?? null,
          },
          create: {
            issueDate: date,
            contactId: sub.contactId,
            productSubscriptionId: sub.id,
            newsDailyIssueId: issue.id,
            status: "SENT",
            sentAt: new Date(),
            providerMessageId: result.messageId ?? null,
          },
        });
        await prisma.productSubscription.update({ where: { id: sub.id }, data: { lastSentAt: new Date() } });
        sent++;
      } catch (err) {
        await prisma.newsDailySend.upsert({
          where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
          update: { newsDailyIssueId: issue.id, status: "FAILED", failedReason: errorMessage(err).slice(0, 500) },
          create: {
            issueDate: date,
            contactId: sub.contactId,
            productSubscriptionId: sub.id,
            newsDailyIssueId: issue.id,
            status: "FAILED",
            failedReason: errorMessage(err).slice(0, 500),
          },
        });
        failed++;
      }
    }
  }

  return {
    date: dateIso,
    segments: { total: bySegment.size, generated, reused, notGenerated, noSources, skippedApproval },
    subscribers: {
      total: subs.length,
      eligible: eligible.length,
      skipped: skippedReasons.length,
      skippedReasons: skippedReasons.slice(0, 25),
    },
    sends: { total: sent + skipped + failed + dryRunCount, sent, skipped, failed, dryRun: dryRunCount },
    durationMs: Date.now() - t0,
  };
}

async function ensureDailyIssue(
  date: Date,
  segmentKey: string,
  seg: NewsSegment,
  opts: { skipGeneration: boolean; tone?: string | null; depth?: string | null },
): Promise<{ issue: NewsDailyIssue; created: boolean }> {
  const existing = await prisma.newsDailyIssue.findUnique({
    where: { issueDate_segmentKey: { issueDate: date, segmentKey } },
  });
  if (existing) return { issue: existing, created: false };

  if (opts.skipGeneration) {
    const issue = await prisma.newsDailyIssue.create({
      data: {
        issueDate: date,
        segmentKey,
        briefingLanguage: seg.briefingLanguage,
        regionFocus: seg.regionFocus,
        topics: seg.topics,
        title: `${seg.regionFocus} briefing`,
        subject: "OneNews: your calm morning briefing",
        previewText: "",
        contentJson: {},
        status: "NOT_GENERATED",
        generationMetadata: { reason: "skip_generation" },
      },
    });
    return { issue, created: true };
  }

  const stories = await loadNewsSourceStories({
    date,
    region: seg.regionFocus,
    language: seg.briefingLanguage,
    topics: seg.topics,
    limit: 5,
  });

  const generated = await generateNewsIssue(seg, stories, { tone: opts.tone, depth: opts.depth });

  const status = generated.generated
    ? "GENERATED"
    : generated.reason === "NO_SOURCES"
      ? "NO_SOURCES"
      : "NOT_GENERATED";

  const issue = await prisma.newsDailyIssue.create({
    data: {
      issueDate: date,
      segmentKey,
      briefingLanguage: seg.briefingLanguage,
      regionFocus: seg.regionFocus,
      topics: seg.topics,
      title: generated.title,
      subject: generated.subject,
      previewText: generated.previewText,
      contentJson: generated.content as unknown as Prisma.InputJsonObject,
      status,
      generationProvider: generated.provider,
      generationModel: generated.model,
      generationMetadata: generated.metadata as Prisma.InputJsonObject,
    },
  });
  if (generated.generated && stories.length > 0) {
    await markStoriesUsed(stories.map((s) => s.id));
  }
  return { issue, created: true };
}

async function upsertSkippedSend(
  date: Date,
  sub: NewsSubRow,
  issue: NewsDailyIssue,
  reason: string,
): Promise<void> {
  await prisma.newsDailySend.upsert({
    where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
    update: { newsDailyIssueId: issue.id, status: "SKIPPED", skippedReason: reason },
    create: {
      issueDate: date,
      contactId: sub.contactId,
      productSubscriptionId: sub.id,
      newsDailyIssueId: issue.id,
      status: "SKIPPED",
      skippedReason: reason,
    },
  });
}

function buildUnsubscribeLink(token: string): string {
  const base =
    process.env.PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "https://oneread.app";
  return `${base}/unsubscribe?subscription=${encodeURIComponent(token)}`;
}

function atUtcMidnight(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
