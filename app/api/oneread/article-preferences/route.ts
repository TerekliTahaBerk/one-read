import { NextResponse } from "next/server";
import {
  parseEmail,
  parseSummaryLanguage,
} from "@/lib/options";
import { upsertArticlePreferences } from "@/lib/subscriptions";
import {
  ensureArticlePreferencesHolder,
} from "@/lib/oneread/access";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { prisma } from "@/lib/prisma";
import { isOfferKey, PRODUCT_ONE_NEWS } from "@/lib/products/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/article-preferences
 *
 * Saves OneArticle preferences for a verified OneRead email. Never grants
 * billing access — Polar remains the source of truth. Once the OneArticle
 * preferences are complete, the billing row can move to PENDING_CHECKOUT.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = parseEmail(payload.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  if (!hasVerifiedEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }

  const summaryLanguage = parseSummaryLanguage(payload.summaryLanguage);
  if (!summaryLanguage) {
    return NextResponse.json({ ok: false, error: "Please choose a summary language." }, { status: 400 });
  }
  if (!isOfferKey(payload.offer)) {
    return NextResponse.json({ ok: false, error: "Please choose a plan." }, { status: 400 });
  }
  try {
    const contact = await prisma.contact.upsert({ where: { email }, update: {}, create: { email } });
    const holder = await ensureArticlePreferencesHolder(contact.id);
    await upsertArticlePreferences(holder.id, {
      // Historical personalization columns are intentionally preserved but
      // are no longer collected by the OneArticle product.
      interests: [],
      primaryInterest: null,
      secondaryInterests: [],
      sourceLanguage: "Any",
      summaryLanguage,
    });
    if (payload.offer === PRODUCT_ONE_NEWS || payload.offer === "one-read") {
      await prisma.productSubscription.upsert({
        where: { contactId_productKey: { contactId: contact.id, productKey: PRODUCT_ONE_NEWS } },
        update: {},
        create: { contactId: contact.id, productKey: PRODUCT_ONE_NEWS, status: "PENDING_PREFERENCES" },
      });
    }
  } catch (err) {
    console.error("[/api/oneread/article-preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
