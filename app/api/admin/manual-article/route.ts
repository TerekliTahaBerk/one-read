/**
 * OneRead — admin endpoint: manually add a candidate article.
 *
 * POST /api/admin/manual-article
 * Auth: header "Authorization: Bearer ${ADMIN_TOKEN}"  (or ?token= / body.token)
 *
 * Body: {
 *   title, url, sourceName?, sourceLanguage?, topic, subtopics?,
 *   excerpt?, cleanedText?, publishedAt?
 * }
 *
 * Saves the article as PENDING so the normal editorial pipeline scores +
 * summarizes it later. Deduplicates by canonical URL. The manually chosen
 * topic/subtopics are preserved (the scorer may refine them later).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canonicalizeUrl } from "@/lib/url-canonical";
import { ALL_TOPIC_SLUGS } from "@/lib/topics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCE_LANGUAGES = ["English", "Turkish"];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Accept the token via Authorization header, ?token=, or body.token so the
  // simple admin form can post without custom headers.
  const url = new URL(req.url);
  const headerToken = (req.headers.get("authorization") ?? "").replace(
    /^Bearer\s+/i,
    "",
  );
  const token =
    headerToken ||
    url.searchParams.get("token") ||
    (typeof body.token === "string" ? body.token : "");
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const title = str(body.title);
  const rawUrl = str(body.url);
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (!rawUrl) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) {
    return NextResponse.json(
      { error: "url must be a valid http(s) URL" },
      { status: 400 },
    );
  }

  const topic = str(body.topic);
  if (!ALL_TOPIC_SLUGS.includes(topic)) {
    return NextResponse.json(
      { error: `topic must be one of: ${ALL_TOPIC_SLUGS.join(", ")}` },
      { status: 400 },
    );
  }

  const sourceName = str(body.sourceName) || "Manual";
  const sourceLanguage = SOURCE_LANGUAGES.includes(str(body.sourceLanguage))
    ? str(body.sourceLanguage)
    : "English";
  const subtopics = parseSubtopics(body.subtopics);
  const rawExcerpt = str(body.excerpt) || null;
  const cleanedText = str(body.cleanedText) || null;
  const publishedAt = parseDate(body.publishedAt);

  // Dedupe by url OR canonicalUrl.
  const existing = await prisma.article.findFirst({
    where: { OR: [{ url: canonical }, { canonicalUrl: canonical }] },
    select: { id: true, url: true },
  });
  if (existing) {
    return NextResponse.json(
      { ok: true, deduped: true, articleId: existing.id, url: existing.url },
      { status: 200 },
    );
  }

  const article = await prisma.article.create({
    data: {
      url: canonical,
      canonicalUrl: canonical,
      title,
      sourceName,
      sourceLanguage,
      topic,
      subtopics,
      tags: ["manual"],
      rawExcerpt,
      cleanedText,
      publishedAt: publishedAt ?? null,
      scoringStatus: "PENDING",
    },
  });

  return NextResponse.json({
    ok: true,
    deduped: false,
    articleId: article.id,
    url: article.url,
    note: "Saved as PENDING. Run `npm run score` (or the pipeline) to score + summarize it.",
  });
}

function str(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function parseSubtopics(x: unknown): string[] {
  if (Array.isArray(x)) {
    return x.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  }
  if (typeof x === "string") {
    return x
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseDate(x: unknown): Date | null {
  if (typeof x !== "string" || !x.trim()) return null;
  const d = new Date(x);
  return Number.isFinite(d.getTime()) ? d : null;
}
