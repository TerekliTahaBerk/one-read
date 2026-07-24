import { prisma } from "@/lib/prisma";
import type { Health } from "@/components/admin/HealthCard";
import { getOverviewMetrics } from "@/lib/admin/queries";
import { getControls } from "@/lib/admin/settings-store";
import { fmtAgo, fmtWhen } from "@/lib/admin/format";
import { getResendStatus } from "@/lib/resend";

export interface ProductHealthSummary {
  key: string;
  name: string;
  href: string;
  health: Health;
  headline: string;
  facts: [string, string][];
}

export async function getOneArticleHealth(): Promise<ProductHealthSummary> {
  const [metrics, nextIssue, lastSent, controls] = await Promise.all([
    getOverviewMetrics(),
    prisma.oneArticleIssue.findFirst({
      where: { status: "SCHEDULED", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
    }),
    prisma.oneArticleDelivery
      .findFirst({
        where: { status: "SENT" },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      })
      .then((row) => row?.sentAt ?? null),
    getControls(),
  ]);
  const cronOn = controls.oneArticle.cronEnabled;
  const emailReady = getResendStatus().hasApiKey;

  let health: Health = "ok";
  let headline = nextIssue ? "Next edition is scheduled" : "No edition scheduled";
  if (!emailReady) {
    health = "problem";
    headline = "Email delivery is not configured";
  } else if (!cronOn) {
    health = "attention";
    headline = "Automatic sending is off";
  } else if (controls.oneArticle.dryRun) {
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
      [
        "Next edition",
        nextIssue
          ? `${nextIssue.readingLanguage} · ${fmtWhen(nextIssue.scheduledFor)}`
          : "Nothing scheduled",
      ],
      ["Automatic sending", cronOn ? "On · checks every 10 minutes" : "Off"],
      ["Delivery mode", controls.oneArticle.dryRun ? "Preview only" : "Live"],
      ["Email delivery", emailReady ? "Connected" : "Needs setup"],
      ["Content mode", "Written by the editorial team"],
      ["Subscribers", `${metrics.eligibleCount} ready to receive`],
      ["Last delivered", fmtAgo(lastSent)],
    ],
  };
}
