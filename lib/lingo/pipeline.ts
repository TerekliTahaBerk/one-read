import { Prisma, type LingoDailyLesson, type LingoPreferences, type ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendDailyEmail } from "@/lib/resend";
import { lingoRequireApproval } from "./config";
import { generateLingoLesson } from "./generator";
import { renderLingoEmail } from "./email-template";
import { evaluateLingoEligibility } from "./subscriptions";
import { segmentFor, segmentKeyFor, type LingoSegment } from "./segments";
import { ONE_LINGO_PRODUCT_KEY } from "@/lib/options";

export interface OneLingoPipelineOptions {
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

export interface OneLingoPipelineResult {
  date: string;
  segments: {
    total: number;
    generated: number;
    reused: number;
    notGenerated: number;
    skippedApproval: number;
  };
  subscribers: {
    total: number;
    eligible: number;
    skipped: number;
    skippedReasons: { email: string; reason: string }[];
  };
  sends: {
    total: number;
    sent: number;
    skipped: number;
    failed: number;
    dryRun: number;
  };
  durationMs: number;
}

type LingoSubRow = ProductSubscription & {
  contact: { id: string; email: string };
  lingoPreferences: LingoPreferences | null;
};

const SENDABLE_APPROVAL_STATUSES = new Set(["APPROVED", "SCHEDULED"]);

export async function runOneLingoDailyPipeline(
  opts: OneLingoPipelineOptions = {},
): Promise<OneLingoPipelineResult> {
  const t0 = Date.now();
  const date = atUtcMidnight(opts.date ?? new Date());
  const dateIso = toIsoDate(date);
  const dryRun = opts.dryRun ?? false;
  const requireApproval = opts.requireApproval ?? lingoRequireApproval();
  const sender = opts.send ?? sendDailyEmail;

  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_LINGO_PRODUCT_KEY },
    include: {
      contact: { select: { id: true, email: true } },
      lingoPreferences: true,
    },
  });

  const eligible: LingoSubRow[] = [];
  const skippedReasons: { email: string; reason: string }[] = [];
  for (const sub of subs) {
    const result = evaluateLingoEligibility(sub);
    if (result.allowed && sub.lingoPreferences) {
      eligible.push(sub);
    } else {
      skippedReasons.push({
        email: sub.contact.email,
        reason: result.reason ?? "missing_language_preferences",
      });
    }
  }

  const bySegment = new Map<string, LingoSubRow[]>();
  for (const sub of eligible) {
    const prefs = sub.lingoPreferences;
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
  let skippedApproval = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let dryRunCount = 0;

  for (const [key, rows] of bySegment.entries()) {
    const prefs = rows[0]?.lingoPreferences;
    if (!prefs) continue;
    const seg = segmentFor(prefs);
    const lessonResult = await ensureDailyLesson(date, key, seg, {
      skipGeneration: opts.skipGeneration ?? false,
      learningGoal: prefs.learningGoal,
      interests: prefs.interests,
    });
    const lesson = lessonResult.lesson;

    if (lessonResult.created) generated++;
    else reused++;
    if (lesson.status !== "GENERATED") notGenerated++;

    const canSendLesson =
      opts.sendNow === true ||
      !requireApproval ||
      SENDABLE_APPROVAL_STATUSES.has(lesson.approvalStatus);

    if (!canSendLesson || lesson.status !== "GENERATED") {
      skippedApproval += rows.length;
      for (const sub of rows) {
        await upsertSkippedSend(date, sub, lesson, lesson.status !== "GENERATED" ? "lesson_not_generated" : "approval_required");
      }
      skipped += rows.length;
      continue;
    }

    for (const sub of rows) {
      const existing = await prisma.lingoDailySend.findUnique({
        where: { lessonDate_contactId: { lessonDate: date, contactId: sub.contactId } },
      });
      if (existing?.status === "SENT") {
        skipped++;
        continue;
      }

      const rendered = renderLingoEmail(lesson, {
        date: dateIso,
        targetLanguage: seg.targetLanguage,
        nativeLanguage: seg.nativeLanguage,
        level: seg.level,
        links: { unsubscribe: buildUnsubscribeLink(sub.unsubscribeToken) },
      });

      if (dryRun) {
        await upsertSkippedSend(date, sub, lesson, "dry_run");
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
        await prisma.lingoDailySend.upsert({
          where: { lessonDate_contactId: { lessonDate: date, contactId: sub.contactId } },
          update: {
            lingoDailyLessonId: lesson.id,
            status: "SENT",
            sentAt: new Date(),
            skippedReason: null,
            failedReason: null,
            providerMessageId: result.messageId ?? null,
          },
          create: {
            lessonDate: date,
            contactId: sub.contactId,
            productSubscriptionId: sub.id,
            lingoDailyLessonId: lesson.id,
            status: "SENT",
            sentAt: new Date(),
            providerMessageId: result.messageId ?? null,
          },
        });
        await prisma.productSubscription.update({
          where: { id: sub.id },
          data: { lastSentAt: new Date() },
        });
        sent++;
      } catch (err) {
        await prisma.lingoDailySend.upsert({
          where: { lessonDate_contactId: { lessonDate: date, contactId: sub.contactId } },
          update: {
            lingoDailyLessonId: lesson.id,
            status: "FAILED",
            failedReason: errorMessage(err).slice(0, 500),
          },
          create: {
            lessonDate: date,
            contactId: sub.contactId,
            productSubscriptionId: sub.id,
            lingoDailyLessonId: lesson.id,
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
    segments: {
      total: bySegment.size,
      generated,
      reused,
      notGenerated,
      skippedApproval,
    },
    subscribers: {
      total: subs.length,
      eligible: eligible.length,
      skipped: skippedReasons.length,
      skippedReasons: skippedReasons.slice(0, 25),
    },
    sends: {
      total: sent + skipped + failed + dryRunCount,
      sent,
      skipped,
      failed,
      dryRun: dryRunCount,
    },
    durationMs: Date.now() - t0,
  };
}

async function ensureDailyLesson(
  date: Date,
  segmentKey: string,
  seg: LingoSegment,
  opts: {
    skipGeneration: boolean;
    learningGoal?: string | null;
    interests?: string[];
  },
): Promise<{ lesson: LingoDailyLesson; created: boolean }> {
  const existing = await prisma.lingoDailyLesson.findUnique({
    where: { lessonDate_segmentKey: { lessonDate: date, segmentKey } },
  });
  if (existing) return { lesson: existing, created: false };

  if (opts.skipGeneration) {
    const lesson = await prisma.lingoDailyLesson.create({
      data: {
        lessonDate: date,
        segmentKey,
        targetLanguage: seg.targetLanguage,
        nativeLanguage: seg.nativeLanguage,
        level: seg.level,
        title: `${seg.targetLanguage} practice (${seg.level})`,
        subject: `Today's OneLingo: ${seg.targetLanguage} practice`,
        previewText: "",
        contentJson: {},
        status: "NOT_GENERATED",
        generationMetadata: { reason: "skip_generation" },
      },
    });
    return { lesson, created: true };
  }

  const generated = await generateLingoLesson(seg, {
    learningGoal: opts.learningGoal,
    interests: opts.interests,
  });

  const lesson = await prisma.lingoDailyLesson.create({
    data: {
      lessonDate: date,
      segmentKey,
      targetLanguage: seg.targetLanguage,
      nativeLanguage: seg.nativeLanguage,
      level: seg.level,
      title: generated.title,
      subject: generated.subject,
      previewText: generated.previewText,
      contentJson: generated.content as unknown as Prisma.InputJsonObject,
      status: generated.generated ? "GENERATED" : "NOT_GENERATED",
      generationProvider: generated.provider,
      generationModel: generated.model,
      generationMetadata: generated.metadata as Prisma.InputJsonObject,
    },
  });
  return { lesson, created: true };
}

async function upsertSkippedSend(
  date: Date,
  sub: LingoSubRow,
  lesson: LingoDailyLesson,
  reason: string,
): Promise<void> {
  await prisma.lingoDailySend.upsert({
    where: { lessonDate_contactId: { lessonDate: date, contactId: sub.contactId } },
    update: {
      lingoDailyLessonId: lesson.id,
      status: "SKIPPED",
      skippedReason: reason,
    },
    create: {
      lessonDate: date,
      contactId: sub.contactId,
      productSubscriptionId: sub.id,
      lingoDailyLessonId: lesson.id,
      status: "SKIPPED",
      skippedReason: reason,
    },
  });
}

function buildUnsubscribeLink(token: string): string {
  const base =
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://oneread.app";
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
