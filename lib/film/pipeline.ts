import { Prisma, type FilmDailyIssue, type FilmPreferences, type ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendDailyEmail } from "@/lib/resend";
import { ONE_FILM_PRODUCT_KEY } from "@/lib/options";
import { filmRequireApproval } from "./config";
import { generateFilmIssue } from "./generator";
import { renderFilmEmail } from "./email-template";
import { pickFilmForSegment, markFilmUsed } from "./catalog";
import { segmentFor, segmentKeyFor, type FilmSegment } from "./segments";

export interface OneFilmPipelineOptions {
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

export interface OneFilmPipelineResult {
  date: string;
  segments: {
    total: number;
    generated: number;
    reused: number;
    notGenerated: number;
    noFilm: number;
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

type FilmSubRow = ProductSubscription & {
  contact: { id: string; email: string };
  filmPreferences: FilmPreferences | null;
};

const SENDABLE_APPROVAL_STATUSES = new Set(["APPROVED", "SCHEDULED"]);

export async function runOneFilmDailyPipeline(
  opts: OneFilmPipelineOptions = {},
): Promise<OneFilmPipelineResult> {
  const t0 = Date.now();
  const date = atUtcMidnight(opts.date ?? new Date());
  const dateIso = toIsoDate(date);
  const dryRun = opts.dryRun ?? false;
  const requireApproval = opts.requireApproval ?? filmRequireApproval();
  const sender = opts.send ?? sendDailyEmail;

  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_FILM_PRODUCT_KEY },
    include: { contact: { select: { id: true, email: true } }, filmPreferences: true },
  });

  // Lazy import avoids a hard circular dependency at module-eval time —
  // lib/oneread/access.ts imports `filmPreferencesComplete` from ./subscriptions.
  const { resolveOneFilmEligibilityForContact } = await import("@/lib/oneread/access");

  const eligible: FilmSubRow[] = [];
  const skippedReasons: { email: string; reason: string }[] = [];
  for (const sub of subs) {
    const result = await resolveOneFilmEligibilityForContact(sub.contact.id);
    if (result.allowed && sub.filmPreferences) eligible.push(sub);
    else skippedReasons.push({ email: sub.contact.email, reason: result.reason ?? "missing_film_preferences" });
  }

  const bySegment = new Map<string, FilmSubRow[]>();
  for (const sub of eligible) {
    const prefs = sub.filmPreferences;
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
  let noFilm = 0;
  let skippedApproval = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let dryRunCount = 0;

  for (const [key, rows] of bySegment.entries()) {
    const prefs = rows[0]?.filmPreferences;
    if (!prefs) continue;
    const seg = segmentFor(prefs);
    const issueResult = await ensureDailyIssue(date, key, seg, {
      skipGeneration: opts.skipGeneration ?? false,
    });
    const issue = issueResult.issue;

    if (issueResult.created) generated++;
    else reused++;
    if (issue.status === "NO_FILM") noFilm++;
    if (issue.status !== "GENERATED") notGenerated++;

    const canSend =
      opts.sendNow === true ||
      !requireApproval ||
      SENDABLE_APPROVAL_STATUSES.has(issue.approvalStatus);

    if (!canSend || issue.status !== "GENERATED") {
      const reason =
        issue.status === "NO_FILM"
          ? "no_film_available"
          : issue.status !== "GENERATED"
            ? "issue_not_generated"
            : "approval_required";
      skippedApproval += rows.length;
      for (const sub of rows) await upsertSkippedSend(date, sub, issue, reason);
      skipped += rows.length;
      continue;
    }

    for (const sub of rows) {
      const existing = await prisma.filmDailySend.findUnique({
        where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
      });
      if (existing?.status === "SENT") {
        skipped++;
        continue;
      }

      const rendered = renderFilmEmail(issue, {
        date: dateIso,
        emailLanguage: seg.emailLanguage,
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
        await prisma.filmDailySend.upsert({
          where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
          update: {
            filmDailyIssueId: issue.id,
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
            filmDailyIssueId: issue.id,
            status: "SENT",
            sentAt: new Date(),
            providerMessageId: result.messageId ?? null,
          },
        });
        await prisma.productSubscription.update({ where: { id: sub.id }, data: { lastSentAt: new Date() } });
        sent++;
      } catch (err) {
        await prisma.filmDailySend.upsert({
          where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
          update: { filmDailyIssueId: issue.id, status: "FAILED", failedReason: errorMessage(err).slice(0, 500) },
          create: {
            issueDate: date,
            contactId: sub.contactId,
            productSubscriptionId: sub.id,
            filmDailyIssueId: issue.id,
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
    segments: { total: bySegment.size, generated, reused, notGenerated, noFilm, skippedApproval },
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
  seg: FilmSegment,
  opts: { skipGeneration: boolean },
): Promise<{ issue: FilmDailyIssue; created: boolean }> {
  const existing = await prisma.filmDailyIssue.findUnique({
    where: { issueDate_segmentKey: { issueDate: date, segmentKey } },
  });
  if (existing) return { issue: existing, created: false };

  if (opts.skipGeneration) {
    const issue = await prisma.filmDailyIssue.create({
      data: {
        issueDate: date,
        segmentKey,
        emailLanguage: seg.emailLanguage,
        genres: seg.genres,
        moods: seg.moods,
        title: "Tonight’s film note",
        subject: "OneFilm: one film worth thinking about",
        previewText: "",
        contentJson: {},
        status: "NOT_GENERATED",
        generationMetadata: { reason: "skip_generation" },
      },
    });
    return { issue, created: true };
  }

  const film = await pickFilmForSegment(seg);
  const generated = await generateFilmIssue(seg, film, {
    spoilerPreference: seg.spoilerPreference,
  });

  const status = generated.generated
    ? "GENERATED"
    : generated.reason === "NO_FILM"
      ? "NO_FILM"
      : "NOT_GENERATED";

  const issue = await prisma.filmDailyIssue.create({
    data: {
      issueDate: date,
      segmentKey,
      emailLanguage: seg.emailLanguage,
      genres: seg.genres,
      moods: seg.moods,
      filmTitle: film?.title ?? null,
      filmYear: film?.year ?? null,
      director: film?.director ?? null,
      filmLanguage: film?.filmLanguage ?? null,
      runtimeMinutes: film?.runtimeMinutes ?? null,
      sourceUrl: film?.sourceUrl ?? null,
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
  if (generated.generated && film) await markFilmUsed(film.id);
  return { issue, created: true };
}

async function upsertSkippedSend(
  date: Date,
  sub: FilmSubRow,
  issue: FilmDailyIssue,
  reason: string,
): Promise<void> {
  await prisma.filmDailySend.upsert({
    where: { issueDate_contactId: { issueDate: date, contactId: sub.contactId } },
    update: { filmDailyIssueId: issue.id, status: "SKIPPED", skippedReason: reason },
    create: {
      issueDate: date,
      contactId: sub.contactId,
      productSubscriptionId: sub.id,
      filmDailyIssueId: issue.id,
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
