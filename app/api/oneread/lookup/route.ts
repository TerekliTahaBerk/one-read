import { NextResponse } from "next/server";
import {
  parseEmail,
  ONE_ARTICLE_PRODUCT_KEY,
  ONE_FILM_PRODUCT_KEY,
  ONE_NEWS_PRODUCT_KEY,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";
import {
  resolveOneReadState,
  resolveOneArticleEligibilityForContact,
  resolveOneFilmEligibilityForContact,
  resolveOneNewsEligibilityForContact,
} from "@/lib/oneread/access";
import { preferencesComplete } from "@/lib/subscriptions";
import { filmPreferencesComplete } from "@/lib/film/subscriptions";
import { newsPreferencesComplete } from "@/lib/news/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/lookup
 * Body: { email: string }
 *
 * Read-only status lookup for the /preferences page. Mirrors the existing
 * per-product subscribe-lookup routes — returns only non-sensitive state
 * (no billing/provider identifiers).
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

  const state = await resolveOneReadState(email);

  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: {
        where: {
          productKey: { in: [ONE_ARTICLE_PRODUCT_KEY, ONE_FILM_PRODUCT_KEY, ONE_NEWS_PRODUCT_KEY] },
        },
        include: { preferences: true, filmPreferences: true, newsPreferences: true },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({
      ok: true,
      ...state,
      articlePreferencesComplete: false,
      filmPreferencesComplete: false,
      newsPreferencesComplete: false,
    });
  }

  const articleHolder = contact.subscriptions.find((s) => s.productKey === ONE_ARTICLE_PRODUCT_KEY);
  const filmHolder = contact.subscriptions.find((s) => s.productKey === ONE_FILM_PRODUCT_KEY);
  const newsHolder = contact.subscriptions.find((s) => s.productKey === ONE_NEWS_PRODUCT_KEY);

  const [articleEligibility, filmEligibility, newsEligibility] = await Promise.all([
    resolveOneArticleEligibilityForContact(contact.id),
    resolveOneFilmEligibilityForContact(contact.id),
    resolveOneNewsEligibilityForContact(contact.id),
  ]);

  return NextResponse.json({
    ok: true,
    ...state,
    articlePreferencesComplete: preferencesComplete(articleHolder?.preferences ?? null),
    filmPreferencesComplete: filmPreferencesComplete(filmHolder?.filmPreferences ?? null),
    newsPreferencesComplete: newsPreferencesComplete(newsHolder?.newsPreferences ?? null),
    articleEligibilityReason: articleEligibility.reason,
    filmEligibilityReason: filmEligibility.reason,
    newsEligibilityReason: newsEligibility.reason,
  });
}
