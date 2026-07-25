import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { csvRow } from "@/lib/admin/csv";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const contacts = await prisma.contact.findMany({
    include: {
      subscriptions: {
        include: { preferences: true, filmPreferences: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "email",
    "contact_created_at",
    "one_read_status",
    "payment_provider",
    "plan",
    "period_end",
    "one_article_status",
    "one_article_delivery",
    "article_interests",
    "article_primary_interest",
    "article_secondary_interests",
    "article_source_language",
    "article_reading_language",
    "article_timezone",
    "one_film_status",
    "one_film_delivery",
    "film_email_language",
    "film_genres",
    "film_moods",
    "film_decades",
    "film_languages",
    "film_platforms",
    "film_spoiler_preference",
    "film_discovery_style",
    "film_runtime_preference",
  ];

  const lines = [csvRow(header)];
  for (const contact of contacts) {
    const umbrella = contact.subscriptions.find((sub) => sub.productKey === "one-read");
    const article = contact.subscriptions.find((sub) => sub.productKey === "one-article");
    const film = contact.subscriptions.find((sub) => sub.productKey === "one-film");
    const articlePrefs = article?.preferences;
    const filmPrefs = film?.filmPreferences;
    lines.push(csvRow([
      contact.email,
      contact.createdAt,
      umbrella?.status,
      umbrella?.paymentProvider,
      umbrella?.plan,
      umbrella?.currentPeriodEnd,
      article?.status,
      article?.emailDeliveryStatus,
      articlePrefs?.interests,
      articlePrefs?.primaryInterest,
      articlePrefs?.secondaryInterests,
      articlePrefs?.sourceLanguage,
      articlePrefs?.summaryLanguage,
      articlePrefs?.timezone,
      film?.status,
      film?.emailDeliveryStatus,
      filmPrefs?.emailLanguage,
      filmPrefs?.preferredGenres,
      filmPrefs?.moods,
      filmPrefs?.decades,
      filmPrefs?.languages,
      filmPrefs?.platforms,
      filmPrefs?.spoilerPreference,
      filmPrefs?.familiarity,
      filmPrefs?.runtimePreference,
    ]));
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="oneread-users-${date}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}

