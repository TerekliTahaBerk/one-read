/**
 * OneRead — admin endpoint: manually add a candidate article.
 *
 * POST /api/admin/manual-article
 * Auth: admin session cookie or ADMIN_TOKEN for internal callers.
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
import { requireAdmin } from "@/lib/admin/auth";

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

  const denied = requireAdmin(req, body);
  if (denied) return denied;

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
