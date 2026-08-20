import { NextResponse } from "next/server";
import { configuredAdminEmails, requireAdmin } from "@/lib/admin/auth";
import { csvRow } from "@/lib/admin/csv";
import { prisma } from "@/lib/prisma";
import { analyzeUserJourney, userRole } from "@/lib/admin/user-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const [contacts, verificationEvents] = await Promise.all([
    prisma.contact.findMany({
      include: {
        subscriptions: {
          where: { productKey: { in: ["one-read", "one-article"] } },
          include: { preferences: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.emailVerificationCode.findMany({
      select: { email: true, createdAt: true, consumedAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const adminEmails = configuredAdminEmails();
  const verificationByEmail = new Map<string, {
    requestedAt: Date;
    verifiedAt: Date | null;
    requestCount: number;
  }>();
  for (const event of verificationEvents) {
    const email = event.email.trim().toLowerCase();
    const current = verificationByEmail.get(email);
    if (!current) {
      verificationByEmail.set(email, {
        requestedAt: event.createdAt,
        verifiedAt: event.consumedAt,
        requestCount: 1,
      });
    } else {
      current.requestCount += 1;
      if (event.consumedAt && (!current.verifiedAt || event.consumedAt > current.verifiedAt)) {
        current.verifiedAt = event.consumedAt;
      }
    }
  }

  const header = [
    "email",
    "role",
    "journey_stage",
    "verification_status",
    "verification_requests",
    "preferences_status",
    "preferences_completed_products",
    "preferences_expected_products",
    "missing_preferences",
    "payment_status",
    "has_paid_ever",
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
  ];

  const lines = [csvRow(header)];
  const exportedEmails = new Set<string>();
  for (const contact of contacts) {
    exportedEmails.add(contact.email.toLowerCase());
    const umbrella = contact.subscriptions.find((sub) => sub.productKey === "one-read");
    const article = contact.subscriptions.find((sub) => sub.productKey === "one-article");
    const articlePrefs = article?.preferences;
    const verification = verificationByEmail.get(contact.email.toLowerCase());
    const journey = analyzeUserJourney({
      subscriptions: contact.subscriptions,
      verificationRequested: Boolean(verification),
      verified: Boolean(verification?.verifiedAt),
    });
    lines.push(csvRow([
      contact.email,
      userRole(contact.email, adminEmails),
      journey.stage,
      journey.verification,
      verification?.requestCount ?? 0,
      journey.preferences,
      journey.completedPreferenceProducts,
      journey.expectedPreferenceProducts,
      journey.missingPreferenceProducts,
      journey.payment,
      journey.hasPaidEver,
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
    ]));
  }

  for (const [email, verification] of verificationByEmail) {
    if (exportedEmails.has(email)) continue;
    exportedEmails.add(email);
    const journey = analyzeUserJourney({
      subscriptions: [],
      verificationRequested: true,
      verified: Boolean(verification.verifiedAt),
    });
    lines.push(csvRow([
      email,
      userRole(email, adminEmails),
      journey.stage,
      journey.verification,
      verification.requestCount,
      journey.preferences,
      0,
      0,
      [],
      journey.payment,
      false,
      "",
      ...Array(header.length - 12).fill(""),
    ]));
  }

  for (const email of adminEmails) {
    if (exportedEmails.has(email.toLowerCase())) continue;
    const journey = analyzeUserJourney({
      subscriptions: [],
      verificationRequested: false,
      verified: false,
    });
    lines.push(csvRow([
      email,
      "ADMIN",
      journey.stage,
      journey.verification,
      0,
      journey.preferences,
      0,
      0,
      [],
      journey.payment,
      false,
      "",
      ...Array(header.length - 12).fill(""),
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
