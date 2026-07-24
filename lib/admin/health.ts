/**
 * Plain-English product health for the admin overview. Folds the existing
 * readiness/metrics helpers into a single { health, headline, facts } shape so
 * the home dashboard and per-product pages tell the same story without any raw
 * enums, model names, or cron strings.
 */

import { prisma } from "@/lib/prisma";
import type { Health } from "@/components/admin/HealthCard";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { getFilmOverviewMetrics } from "@/lib/admin/film-queries";
import { getLingoOverviewMetrics } from "@/lib/admin/lingo-queries";
import { getOneReadOverviewMetrics } from "@/lib/admin/oneread-queries";
import {
  getOneArticleIssueReadiness,
  getOneArticleAiStatus,
  nextOneArticleSend,
} from "@/lib/admin/one-article-ops";
import { getControls } from "@/lib/admin/settings-store";
import { getRunSnapshot, runStatusLabel, type RunSnapshot } from "@/lib/admin/operational-runs";
import { ONE_FILM_PRODUCT_KEY, ONE_LINGO_PRODUCT_KEY } from "@/lib/options";
import { getLlmStatus } from "@/lib/llm";
import { fmtAgo, fmtWhen, todayUtc } from "@/lib/admin/format";
import { getResendStatus } from "@/lib/resend";

export interface ProductHealthSummary {
  key: string;
  name: string;
  href: string;
  health: Health;
  headline: string;
  facts: [string, string][];
}

/** True when the AI brain is actually usable (key present and provider ready). */
export function aiBrainWorking(): boolean {
  const s = getLlmStatus();
  return s.configured && s.hasGeminiKey;
}

async function latestSentAt(
  model: "dailySend" | "filmDailySend" | "lingoDailySend",
): Promise<Date | null> {
  // @ts-expect-error — indexing the delegate by name keeps this generic.
  const row = await prisma[model].findFirst({
    where: { status: "SENT" },
    orderBy: { sentAt: "desc" },
    select: { sentAt: true },
  });
  return row?.sentAt ?? null;
}

export async function getOneArticleHealth(): Promise<ProductHealthSummary> {
  const [m, nextIssue, lastSent] = await Promise.all([
    getOverviewMetrics(),
    prisma.oneArticleIssue.findFirst({
      where: { status: "SCHEDULED", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
    }),
    prisma.oneArticleDelivery.findFirst({
      where: { status: "SENT" },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }).then((row) => row?.sentAt ?? null),
  ]);
  const controls = (await getControls()).oneArticle;
  const cronOn = controls.cronEnabled;
  const emailReady = getResendStatus().hasApiKey;

  let health: Health = "ok";
  let headline = nextIssue ? "Next edition is scheduled" : "No edition scheduled";
  if (!emailReady) {
    health = "problem";
    headline = "Email delivery is not configured";
  } else if (!cronOn) {
    health = "attention";
    headline = "Automatic sending is off";
  } else if (controls.dryRun) {
    health = "attention";
    headline = "Delivery is in preview mode";
  } else if (!nextIssue) {
    health = "attention";
  }

  return {
    key: "one-article",
    name: "OneArticle",
    href: "/admin/one-article",
    health,
    headline,
    facts: [
      ["Next edition", nextIssue ? `${nextIssue.readingLanguage} · ${fmtWhen(nextIssue.scheduledFor)}` : "Nothing scheduled"],
      ["Automatic sending", cronOn ? "On · checks every 10 minutes" : "Off"],
      ["Delivery mode", controls.dryRun ? "Preview only" : "Live"],
      ["Email delivery", emailReady ? "Connected" : "Needs setup"],
      ["Content mode", "Manual editorial"],
      ["Subscribers", `${m.eligibleCount} ready to receive`],
      ["Last delivered", fmtAgo(lastSent)],
    ],
  };
}

export async function getFilmHealth(): Promise<ProductHealthSummary> {
  const [f, lastSent, run] = await Promise.all([
    getFilmOverviewMetrics(),
    latestSentAt("filmDailySend"),
    getRunSnapshot(ONE_FILM_PRODUCT_KEY),
  ]);
  const cronOn = (await getControls()).film.cronEnabled;
  const todayReady = f.issues.approvedOrScheduled > 0;
  const runFailed = run.last?.status === "FAILED";

  const health: Health = runFailed ? "problem" : !cronOn ? "attention" : todayReady ? "ok" : "attention";
  const headline = runFailed
    ? "Last run failed"
    : !cronOn
      ? "Automatic sending is off"
      : todayReady
        ? "Today's note is ready"
        : "No note prepared yet";

  return {
    key: "one-film",
    name: "OneFilm",
    href: "/admin/one-film",
    health,
    headline,
    facts: [
      ["Today's note", todayReady ? "Ready" : f.issues.total > 0 ? "Being prepared" : "Nothing yet"],
      ["Automatic sending", cronOn ? "On" : "Off"],
      ["Last run", runFact(run)],
      ["Subscribers", `${f.subscribers.eligible} ready to receive`],
      ["Last delivered", fmtAgo(lastSent)],
    ],
  };
}

export async function getLingoHealth(): Promise<ProductHealthSummary> {
  const [l, lastSent, run] = await Promise.all([
    getLingoOverviewMetrics(),
    latestSentAt("lingoDailySend"),
    getRunSnapshot(ONE_LINGO_PRODUCT_KEY),
  ]);
  const cronOn = (await getControls()).lingo.cronEnabled;
  const todayReady = l.lessons.approvedOrScheduled > 0;
  const runFailed = run.last?.status === "FAILED";

  const health: Health = runFailed ? "problem" : !cronOn ? "attention" : todayReady ? "ok" : "attention";
  const headline = runFailed
    ? "Last run failed"
    : !cronOn
      ? "Automatic sending is off"
      : todayReady
        ? "Today's lesson is ready"
        : "No lesson prepared yet";

  return {
    key: "one-lingo",
    name: "OneLingo",
    href: "/admin/one-lingo",
    health,
    headline,
    facts: [
      ["Today's lesson", todayReady ? "Ready" : l.lessons.total > 0 ? "Being prepared" : "Nothing yet"],
      ["Automatic sending", cronOn ? "On" : "Off"],
      ["Last run", runFact(run)],
      ["Subscribers", `${l.subscribers.eligible} ready to receive`],
      ["Last delivered", fmtAgo(lastSent)],
    ],
  };
}

/** Plain "when · outcome" for a run snapshot, or "Never run yet". */
function runFact(run: RunSnapshot): string {
  if (!run.last) return "Never run yet";
  return `${fmtAgo(run.last.startedAt)} · ${runStatusLabel(run.last.status)}`;
}

export async function getOneReadHealth(): Promise<ProductHealthSummary> {
  const o = await getOneReadOverviewMetrics();
  return {
    key: "one-read",
    name: "OneRead (bundle)",
    href: "/admin/settings",
    health: "ok",
    headline:
      o.activeOrTrialing > 0
        ? `${o.activeOrTrialing} active or trialing`
        : "No paid members yet",
    facts: [
      ["Members", `${o.total} total`],
      ["Active / trialing", `${o.activeOrTrialing}`],
      ["Awaiting payment", `${o.pendingCheckout}`],
      ["Setting up", `${o.pendingPreferences}`],
    ],
  };
}

/** Plain phrasing for a OneArticle readiness status string. */
function issuePhrase(status: string): string {
  switch (status) {
    case "Already sent":
      return "Delivered";
    case "Ready for scheduled send":
      return "Ready";
    case "Approved, not scheduled":
      return "Approved";
    case "Needs approval":
      return "Needs review";
    case "Needs content":
      return "Nothing yet";
    default:
      return status;
  }
}
