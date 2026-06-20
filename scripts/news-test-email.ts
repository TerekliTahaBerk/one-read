/**
 * OneRead — OneNews TEST email sender (SAFE, isolated).
 *
 * Builds OneNews briefings from MANUAL source bundles and renders/sends them as
 * clearly-marked TEST emails. This is deliberately isolated from the production
 * pipeline:
 *   - Recipient is HARD-LOCKED to a single test address. Any other recipient is
 *     refused.
 *   - It NEVER writes to the database (no NewsDailyIssue / NewsDailySend rows).
 *   - It NEVER touches production subscribers or marks real sends.
 *   - Subject is always prefixed "[TEST]".
 *   - No sponsor content (sanitizer runs first); all source links come from the
 *     bundle; the NO_SOURCES case reports and never sends.
 *
 * Usage:
 *   npm run news:test-email             # dry preview only (no email sent)
 *   npm run news:test-email -- --send   # actually send the [TEST] emails
 *
 * Generation uses the deterministic grounded fallback when GEMINI_API_KEY is not
 * present locally, so the email still renders the new 5-minute-brief format.
 */

import type { NewsSourceStory } from "@prisma/client";
import { generateNewsIssue } from "../lib/news/generator";
import { renderNewsEmail } from "../lib/news/email-template";
import { sanitizeSourceStories, findSponsorMarker } from "../lib/news/sanitize";
import type { NewsSegment } from "../lib/news/segments";
import { sendDailyEmail } from "../lib/resend";
import { geminiConfigured } from "../lib/ai";

/** HARD-LOCKED test recipient. Sending to anyone else is refused. */
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
    headline: "",
    sourceName: "",
    sourceUrl: "",
    excerpt: null,
    topic: "world",
    region: "Türkiye",
    language: "Turkish",
    storyDate: now,
    createdAt: now,
    usedAt: null,
    createdBy: "news:test-email",
    ...p,
  } as NewsSourceStory;
}

/** Scenario 1 — a clean, valid weekday bundle. */
function validBundle(): NewsSourceStory[] {
  return [
    story({ id: "v1", topic: "markets", headline: "Borsa güne yatay başladı", sourceName: "Örnek Finans", sourceUrl: "https://example.com/piyasa/acilis", excerpt: "Endeks açılışta sınırlı hareket etti; yatırımcılar enflasyon verisini bekliyor." }),
    story({ id: "v2", topic: "economy", headline: "Yıllık enflasyon beklentilere yakın geldi", sourceName: "Örnek Ekonomi", sourceUrl: "https://example.com/ekonomi/enflasyon", excerpt: "Açıklanan veri piyasa tahminleriyle uyumlu gerçekleşti." }),
    story({ id: "v3", topic: "business", headline: "Sanayi şirketi yeni yatırım planını duyurdu", sourceName: "Örnek İş", sourceUrl: "https://example.com/sirket/yatirim", excerpt: "Şirket önümüzdeki dönem için kapasite artışı planladığını bildirdi." }),
    story({ id: "v4", topic: "politics", headline: "Mecliste yeni düzenleme görüşülecek", sourceName: "Örnek Politika", sourceUrl: "https://example.com/politika/duzenleme", excerpt: "Komisyon, tasarıyı bu hafta ele alacak." }),
    story({ id: "v5", topic: "technology", headline: "Yerli teknoloji girişimi yeni tur yatırım aldı", sourceName: "Örnek Teknoloji", sourceUrl: "https://example.com/teknoloji/yatirim", excerpt: "Girişim, büyümesini hızlandırmak için kaynak sağladı." }),
  ];
}

/** Scenario 2 — valid stories PLUS sponsor blocks that must be filtered out. */
function sponsoredBundle(): NewsSourceStory[] {
  return [
    ...validBundle().slice(0, 3),
    story({ id: "s1", topic: "world", headline: "BUGÜNKÜ DESTEKÇİMİZ: MarkaX", sourceName: "Örnek Bülten", sourceUrl: "https://example.com/sponsor/markax", excerpt: "Detaylar için burayı ziyaret edebilirsiniz. Marka hikayelerinizi paylaşmak için sales@markax.com" }),
    story({ id: "s2", topic: "world", headline: "Günün önerileri — Sponsorlu", sourceName: "Örnek Bülten", sourceUrl: "https://example.com/sponsor/oneriler", excerpt: "Reklam ve işbirliği için bizimle iletişime geçin. Rezervasyon yapabilirsiniz." }),
    story({ id: "s3", topic: "economy", headline: "Merkez bankası faiz kararını açıkladı", sourceName: "Örnek Ekonomi", sourceUrl: "https://example.com/ekonomi/faiz", excerpt: "Karar piyasa beklentisiyle uyumlu geldi. (Sponsorlu içerik bu cümleden sonra: reklam metni.)" }),
  ];
}

/** Scenario 3 — weekend material present. */
function weekendBundle(): NewsSourceStory[] {
  return [
    ...validBundle().slice(0, 4),
    story({ id: "w1", topic: "weekend", headline: "Haftanın okuması: uzun soluklu bir deneme", sourceName: "Örnek Kültür", sourceUrl: "https://example.com/kultur/okuma", excerpt: "Hafta sonu için sakin bir okuma önerisi." }),
    story({ id: "w2", topic: "culture", headline: "Şehirde bu hafta sonu öne çıkan etkinlikler", sourceName: "Örnek Ajanda", sourceUrl: "https://example.com/ajanda/haftasonu", excerpt: "Sergi ve konser ajandasından kısa bir seçki." }),
  ];
}

interface Scenario {
  name: string;
  bundle: NewsSourceStory[];
  expectSend: boolean;
}

async function runScenario(s: Scenario, send: boolean) {
  console.log(`\n========== ${s.name} ==========`);

  const sanitized = sanitizeSourceStories(s.bundle);
  console.log(`  sanitizer: ${s.bundle.length} in → ${sanitized.clean.length} clean · sponsor blocks dropped=${sanitized.droppedSponsorCount} · excerpts cleaned=${sanitized.cleanedExcerptCount}`);

  const issue = await generateNewsIssue(SEG, s.bundle, { allowDeterministic: true, today: new Date().toISOString().slice(0, 10) });

  if (!issue.generated) {
    console.log(`  generated=false reason=${issue.reason} provider=${issue.provider}`);
    if (!s.expectSend) console.log("  PASS: correctly did not generate (no send).");
    else console.error("  FAIL: expected a sendable briefing.");
    return;
  }

  const rendered = renderNewsEmail(
    { subject: issue.subject, previewText: issue.previewText, contentJson: issue.content as never },
    { date: new Date().toISOString().slice(0, 10), briefingLanguage: SEG.briefingLanguage, regionFocus: SEG.regionFocus, links: { unsubscribe: "https://oneread.app/unsubscribe?preview=1" } },
  );

  // Hard safety: sponsor phrase must not appear in the rendered email body.
  // (The footer's "reklamsız" / ad-free copy is correctly ignored by the matcher.)
  const sponsorHit = findSponsorMarker(rendered.text);
  if (sponsorHit) {
    console.error(`  FAIL: sponsor phrase ("${sponsorHit}") leaked into rendered email — refusing to send.`);
    return;
  }

  const subject = `[TEST] ${rendered.subject}`;
  console.log(`  provider=${issue.provider} model=${issue.model ?? "—"} · agenda items=${issue.content.agendaItems?.length ?? 0}`);
  console.log(`  subject: ${subject}`);
  console.log(`  sources: ${issue.content.sources.map((x) => x.url).join(", ")}`);

  if (!send) {
    console.log("  DRY PREVIEW (no email sent). Pass -- --send to deliver.");
    return;
  }

  const result = await sendDailyEmail({ to: TEST_RECIPIENT, subject, text: rendered.text, html: rendered.html });
  if (result.messageId) {
    console.log(`  SENT to ${TEST_RECIPIENT} · messageId=${result.messageId}`);
  } else {
    console.log(`  NOT DELIVERED: Resend returned no message id (RESEND_API_KEY missing/empty locally). The email was rendered and the send was attempted to ${TEST_RECIPIENT}; run this where RESEND_API_KEY is set to deliver.`);
  }
}

async function main() {
  const send = process.argv.includes("--send");

  // Recipient guard — refuse any override that is not the locked test address.
  const recipientOverride = process.argv.find((a) => a.startsWith("--to="));
  if (recipientOverride && recipientOverride.slice("--to=".length) !== TEST_RECIPIENT) {
    throw new Error(`Refusing to send: recipient is hard-locked to ${TEST_RECIPIENT}.`);
  }

  console.log(`[news:test-email] recipient=${TEST_RECIPIENT} · mode=${send ? "SEND" : "DRY PREVIEW"} · gemini=${geminiConfigured() ? "configured" : "missing (deterministic fallback)"}`);
  console.log("[news:test-email] never writes DB · never touches production subscribers");

  const scenarios: Scenario[] = [
    { name: "1) Valid weekday bundle", bundle: validBundle(), expectSend: true },
    { name: "2) Sponsor-filtered bundle", bundle: sponsoredBundle(), expectSend: true },
    { name: "3) Weekend bundle", bundle: weekendBundle(), expectSend: true },
    { name: "4) No-source case (must NOT send)", bundle: [], expectSend: false },
  ];

  for (const s of scenarios) await runScenario(s, send);
  console.log("\n[news:test-email] done.");
}

main().catch((err) => {
  console.error("[news:test-email] error:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
