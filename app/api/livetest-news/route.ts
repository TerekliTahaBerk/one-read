/**
 * TEMPORARY OneNews live-test route (token-gated). Deployed to a Vercel PREVIEW
 * to validate real Gemini Flash generation + Resend delivery for the new 06:30
 * 5-minute morning brief. Safe by construction:
 *   - Requires NEWS_LIVETEST_TOKEN; 401 otherwise.
 *   - Recipient HARD-LOCKED to a single test address.
 *   - Subjects always prefixed "[TEST]".
 *   - NEVER imports prisma / writes the DB / touches subscribers / DailySend.
 *   - Returns JSON with NO secrets.
 *
 * REMOVE THIS FILE after the live test (and delete the preview deployment).
 */

import { NextResponse } from "next/server";
import type { NewsSourceStory } from "@prisma/client";
import { generateNewsIssue } from "@/lib/news/generator";
import { renderNewsEmail } from "@/lib/news/email-template";
import { sanitizeSourceStories, findSponsorMarker } from "@/lib/news/sanitize";
import { geminiConfigured, generateJsonWithGemini } from "@/lib/ai";
import { NEWS_SYSTEM_PROMPT, NEWS_PROMPT_VERSION, NewsBriefingSchema, buildNewsUserPrompt } from "@/lib/news/prompts";
import { sendDailyEmail, getResendStatus } from "@/lib/resend";
import type { NewsSegment } from "@/lib/news/segments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TEST_RECIPIENT = "tterekli9@gmail.com";

const SEG: NewsSegment = {
  briefingLanguage: "Turkish",
  regionFocus: "Türkiye",
  topics: ["markets", "economy", "business", "politics", "technology"],
};

function story(p: Partial<NewsSourceStory>): NewsSourceStory {
  const now = new Date();
  return {
    id: p.id ?? Math.random().toString(36).slice(2),
    headline: "", sourceName: "", sourceUrl: "", excerpt: null,
    topic: "world", region: "Türkiye", language: "Turkish",
    storyDate: now, createdAt: now, usedAt: null, createdBy: "news:livetest",
    ...p,
  } as NewsSourceStory;
}

function validBundle(): NewsSourceStory[] {
  return [
    story({ id: "v1", topic: "markets", headline: "Borsa İstanbul güne yatay başladı", sourceName: "Örnek Finans", sourceUrl: "https://example.com/piyasa/acilis", excerpt: "Endeks açılışta sınırlı hareket etti; yatırımcılar yurt içi enflasyon verisini ve küresel piyasalardaki seyri izliyor." }),
    story({ id: "v2", topic: "economy", headline: "Yıllık enflasyon beklentilere yakın geldi", sourceName: "Örnek Ekonomi", sourceUrl: "https://example.com/ekonomi/enflasyon", excerpt: "Açıklanan veri piyasa tahminleriyle büyük ölçüde uyumlu gerçekleşti; aylık artış bir önceki aya göre yavaşladı." }),
    story({ id: "v3", topic: "business", headline: "Sanayi şirketi yeni kapasite yatırımını duyurdu", sourceName: "Örnek İş", sourceUrl: "https://example.com/sirket/yatirim", excerpt: "Şirket, önümüzdeki iki yıl için üretim kapasitesini artıracak yatırım planını paylaştı." }),
    story({ id: "v4", topic: "politics", headline: "Mecliste yeni düzenleme bu hafta görüşülecek", sourceName: "Örnek Politika", sourceUrl: "https://example.com/politika/duzenleme", excerpt: "İlgili komisyon, tasarıyı bu hafta ele almaya hazırlanıyor." }),
    story({ id: "v5", topic: "technology", headline: "Yerli teknoloji girişimi yeni yatırım turunu kapattı", sourceName: "Örnek Teknoloji", sourceUrl: "https://example.com/teknoloji/yatirim", excerpt: "Girişim, büyümesini hızlandırmak ve ekibini genişletmek için yeni kaynak sağladı." }),
  ];
}

function sponsoredBundle(): NewsSourceStory[] {
  return [
    ...validBundle().slice(0, 3),
    story({ id: "s1", topic: "world", headline: "BUGÜNKÜ DESTEKÇİMİZ: MarkaX", sourceName: "Örnek Bülten", sourceUrl: "https://example.com/sponsor/markax", excerpt: "Detaylar için burayı ziyaret edebilirsiniz. Marka hikayelerinizi paylaşmak için sales@markax.com" }),
    story({ id: "s2", topic: "world", headline: "Günün önerileri — Sponsorlu", sourceName: "Örnek Bülten", sourceUrl: "https://example.com/sponsor/oneriler", excerpt: "Reklam ve işbirliği için bizimle iletişime geçin. Rezervasyon yapabilirsiniz." }),
    story({ id: "s3", topic: "economy", headline: "Merkez bankası faiz kararını açıkladı", sourceName: "Örnek Ekonomi", sourceUrl: "https://example.com/ekonomi/faiz", excerpt: "Karar piyasa beklentisiyle uyumlu geldi ve gerekçe metni yayımlandı. Sponsorlu içerik: reklam metni bu cümlede yer alıyor." }),
  ];
}

function weekendBundle(): NewsSourceStory[] {
  return [
    ...validBundle().slice(0, 4),
    story({ id: "w1", topic: "weekend", headline: "Haftanın okuması: uzun soluklu bir deneme", sourceName: "Örnek Kültür", sourceUrl: "https://example.com/kultur/okuma", excerpt: "Hafta sonu için sakin, uzun soluklu bir okuma önerisi." }),
    story({ id: "w2", topic: "culture", headline: "Şehirde bu hafta sonu öne çıkan etkinlikler", sourceName: "Örnek Ajanda", sourceUrl: "https://example.com/ajanda/haftasonu", excerpt: "Sergi ve konser ajandasından kısa bir seçki." }),
  ];
}

interface ScenarioResult {
  name: string;
  generated: boolean;
  reason?: string;
  provider: string | null;
  model: string | null;
  sanitizer: { in: number; clean: number; droppedSponsorCount: number; cleanedExcerptCount: number };
  agendaCount: number;
  allUrlsFromBundle: boolean;
  sponsorLeak: string | null;
  subject?: string;
  greeting?: string;
  mainHeadline?: string;
  mainSummary?: string;
  agenda?: { category: string; title: string; summary: string }[];
  weekendCount?: number;
  sources?: string[];
  delivered: boolean;
  providerMessageId: string | null;
}

async function runScenario(name: string, bundle: NewsSourceStory[], expectSend: boolean, send: boolean): Promise<ScenarioResult> {
  const san = sanitizeSourceStories(bundle);
  const allowedUrlsBefore = new Set(san.clean.map((s) => s.sourceUrl));

  const issue = await generateNewsIssue(SEG, bundle, { today: new Date().toISOString().slice(0, 10) });

  const base: ScenarioResult = {
    name,
    generated: issue.generated,
    reason: issue.reason,
    provider: issue.provider,
    model: issue.model,
    sanitizer: { in: bundle.length, clean: san.clean.length, droppedSponsorCount: san.droppedSponsorCount, cleanedExcerptCount: san.cleanedExcerptCount },
    agendaCount: issue.content.agendaItems?.length ?? 0,
    allUrlsFromBundle: true,
    sponsorLeak: null,
    delivered: false,
    providerMessageId: null,
  };

  if (!issue.generated) {
    base.allUrlsFromBundle = true;
    return base; // NO_SOURCES / GENERATION_UNAVAILABLE — no send
  }

  const agenda = issue.content.agendaItems ?? [];
  base.allUrlsFromBundle = agenda.every((a) => allowedUrlsBefore.has(a.url)) && (issue.content.weekendExtra ?? []).every((w) => allowedUrlsBefore.has(w.url));

  const rendered = renderNewsEmail(
    { subject: issue.subject, previewText: issue.previewText, contentJson: issue.content as never },
    { date: new Date().toISOString().slice(0, 10), briefingLanguage: SEG.briefingLanguage, regionFocus: SEG.regionFocus, links: { unsubscribe: "https://oneread.email/unsubscribe?preview=1" } },
  );
  base.sponsorLeak = findSponsorMarker(rendered.text);
  base.subject = `[TEST] ${rendered.subject}`;
  base.greeting = issue.content.greeting;
  base.mainHeadline = issue.content.mainHeadline;
  base.mainSummary = issue.content.mainSummary;
  base.agenda = agenda.map((a) => ({ category: a.category, title: a.title, summary: a.summary }));
  base.weekendCount = issue.content.weekendExtra?.length ?? 0;
  base.sources = issue.content.sources.map((s) => s.url);

  // Safety: never send if a sponsor phrase leaked or any URL is not from bundle.
  if (!send || !expectSend || base.sponsorLeak || !base.allUrlsFromBundle) return base;

  const result = await sendDailyEmail({ to: TEST_RECIPIENT, subject: base.subject, text: rendered.text, html: rendered.html });
  base.delivered = !!result.messageId;
  base.providerMessageId = result.messageId ?? null;
  return base;
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? req.headers.get("x-livetest-token") ?? "";
  const expected = process.env.NEWS_LIVETEST_TOKEN ?? "";
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Diagnostics: run a single raw Gemini call and surface the exact result.
  if (url.searchParams.get("diag") === "1") {
    const bundle = sanitizeSourceStories(validBundle()).clean;
    const r = await generateJsonWithGemini(
      buildNewsUserPrompt(SEG, bundle, { today: new Date().toISOString().slice(0, 10) }),
      NewsBriefingSchema,
      { product: "one-news", task: "news-briefing", tier: "quality", system: NEWS_SYSTEM_PROMPT, promptVersion: NEWS_PROMPT_VERSION, maxOutputTokens: 8192 },
    );
    return NextResponse.json({
      ok: true,
      diag: r.ok
        ? { ok: true, model: r.model, repaired: r.repaired, subject: r.data.subject, agendaCount: r.data.agendaItems.length }
        : { ok: false, kind: r.kind, message: String(r.message).slice(0, 500), model: r.model ?? null },
    });
  }

  const send = url.searchParams.get("send") === "1";
  const resend = getResendStatus();

  const scenarios = [
    { name: "1) Valid weekday brief", bundle: validBundle(), expectSend: true },
    { name: "2) Sponsor-filtered brief", bundle: sponsoredBundle(), expectSend: true },
    { name: "3) Weekend brief", bundle: weekendBundle(), expectSend: true },
    { name: "4) NO_SOURCES (must not send)", bundle: [] as NewsSourceStory[], expectSend: false },
  ];

  const onlyParam = url.searchParams.get("only");
  const only = onlyParam ? Number(onlyParam) : null;
  const selected = only && only >= 1 && only <= scenarios.length ? [scenarios[only - 1]] : scenarios;

  const results: ScenarioResult[] = [];
  for (const s of selected) results.push(await runScenario(s.name, s.bundle, s.expectSend, send));

  return NextResponse.json({
    ok: true,
    recipient: TEST_RECIPIENT,
    mode: send ? "SEND" : "DRY",
    env: { geminiConfigured: geminiConfigured(), resendHasApiKey: resend.hasApiKey, resendUsingFallbackSender: resend.usingFallbackSender, nodeEnv: process.env.NODE_ENV ?? null },
    results,
  });
}

export const GET = handler;
export const POST = handler;
