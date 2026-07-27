import { prisma } from "@/lib/prisma";
import type { Health } from "@/components/admin/HealthCard";
import { getControls } from "@/lib/admin/settings-store";
import { fmtAgo, fmtWhen } from "@/lib/admin/format";
import { getResendStatus } from "@/lib/resend";
import {
  resolveOneArticleEligibilityForContact,
  resolveOneFilmEligibilityForContact,
} from "@/lib/oneread/access";

export interface ProductHealthSummary {
  key: string;
  name: string;
  href: string;
  health: Health;
  headline: string;
  facts: [string, string][];
}

export async function getOneArticleHealth(): Promise<ProductHealthSummary> {
  const [nextIssue, lastSent, controls, subscriptions] = await Promise.all([
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
    prisma.productSubscription.findMany({
      where: { productKey: "one-article" },
      select: { contactId: true },
    }),
  ]);
  const eligibility = await Promise.all(
    subscriptions.map((subscription) =>
      resolveOneArticleEligibilityForContact(subscription.contactId),
    ),
  );
  const eligibleCount = eligibility.filter((result) => result.allowed).length;
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
      ["Subscribers", `${eligibleCount} ready to receive`],
      ["Last delivered", fmtAgo(lastSent)],
    ],
  };
}

export async function getOneFilmHealth(): Promise<ProductHealthSummary> {
  const [nextIssue, lastSent, controls, subscriptions] = await Promise.all([
    prisma.oneFilmIssue.findFirst({
      where: { status: "SCHEDULED", scheduledFor: { gte: new Date() } },
      orderBy: { scheduledFor: "asc" },
    }),
    prisma.oneFilmDelivery
      .findFirst({
        where: { status: "SENT" },
        orderBy: { sentAt: "desc" },
        select: { sentAt: true },
      })
      .then((row) => row?.sentAt ?? null),
    getControls(),
    prisma.productSubscription.findMany({
      where: { productKey: "one-film" },
      select: { contactId: true },
    }),
  ]);
  const eligibility = await Promise.all(
    subscriptions.map((subscription) =>
      resolveOneFilmEligibilityForContact(subscription.contactId),
    ),
  );
  const eligibleCount = eligibility.filter((result) => result.allowed).length;
  const cronOn = controls.film.cronEnabled;
  const emailReady = getResendStatus().hasApiKey;

  let health: Health = "ok";
  let headline = nextIssue ? "Next film edition is scheduled" : "No film edition scheduled";
  if (!emailReady) {
    health = "problem";
    headline = "Email delivery is not configured";
  } else if (!cronOn) {
    health = "attention";
    headline = "Automatic sending is off";
  } else if (controls.film.dryRun) {
    health = "attention";
    headline = "Delivery is in preview mode";
  } else if (!nextIssue) {
    health = "attention";
  }

  return {
    key: "one-film",
    name: "OneFilm",
    href: "/admin/one-film",
    health,
    headline,
    facts: [
      [
        "Next edition",
        nextIssue
          ? `${nextIssue.emailLanguage} · ${fmtWhen(nextIssue.scheduledFor)}`
          : "Nothing scheduled",
      ],
      ["Automatic sending", cronOn ? "On · checks every 10 minutes" : "Off"],
      ["Delivery mode", controls.film.dryRun ? "Preview only" : "Live"],
      ["Email delivery", emailReady ? "Connected" : "Needs setup"],
      ["Content mode", "Written by the editorial team"],
      ["Subscribers", `${eligibleCount} ready to receive`],
      ["Last delivered", fmtAgo(lastSent)],
    ],
  };
}
