import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { topicBySlug } from "@/lib/topics";
import { getLlmStatus } from "@/lib/llm";
import { getResendStatus } from "@/lib/resend";
import { getLaunchReadiness, type ReadinessStatus } from "@/lib/launch-readiness";
import { isHeuristicGenerator } from "@/lib/summarizer";
import { renderDailyEmail } from "@/lib/email-template";
import type { StructuredSummary } from "@/lib/llm";
import { PreviewPickButton } from "@/components/PreviewPickButton";
import { isDemoModeEnabled } from "@/lib/thresholds";
import {
  MIN_ARTICLE_SCORE,
  MIN_DELIVERY_SCORE,
  MIN_SUMMARY_CONFIDENCE,
  MIN_EXTRACTION_CONFIDENCE,
} from "@/lib/thresholds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin — minimal editorial preview.
 *
 * Auth: append `?token=<ADMIN_TOKEN>` to the URL. The matching env var
 * is intentionally kept out of the client bundle. This is a private,
 * single-screen tool — not a dashboard.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: { token?: string; date?: string };
}) {
  const token = searchParams.token;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return (
      <Shell>
        <p className="text-ash text-sm">
          Set <code>ADMIN_TOKEN</code> in your environment to enable the admin preview.
        </p>
      </Shell>
    );
  }
  if (token !== expected) {
    redirect("/");
  }

  const targetDate = searchParams.date
    ? new Date(searchParams.date + "T00:00:00Z")
    : todayUtc();
  const isoDate = targetDate.toISOString().slice(0, 10);

  const [picks, sends, totalSubs, sources, recentArticles, summaries, feedbackRows] =
    await Promise.all([
      prisma.topicDailyPick.findMany({
        where: { date: targetDate },
        include: { article: true },
        orderBy: [{ topic: "asc" }, { sourceLanguage: "asc" }],
      }),
      prisma.dailySend.findMany({
        where: { date: targetDate },
        include: { pick: true, subscriber: true },
        orderBy: { personalizedScore: "desc" },
      }),
      prisma.subscriber.count({ where: { status: "ACTIVE" } }),
      prisma.source.findMany({
        orderBy: [{ active: "desc" }, { slug: "asc" }],
      }),
      prisma.article.findMany({
        orderBy: { ingestedAt: "desc" },
        take: 30,
      }),
      prisma.summary.findMany({
        where: { pick: { date: targetDate } },
        include: { pick: { include: { article: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.feedback.groupBy({
        by: ["reaction"],
        _count: { _all: true },
      }),
    ]);

  const readiness = getLaunchReadiness();

  // Identify demo / manual articles for labeling + preview actions.
  const isDemoOrManual = (a: { sourceName: string; tags: string[] }): boolean =>
    a.sourceName === "One Read Demo" ||
    a.tags.includes("demo") ||
    a.tags.includes("manual");

  // Build email previews for READY summaries (rendering only — never sends).
  const emailPreviews = summaries
    .filter((s) => s.status === "READY")
    .slice(0, 8)
    .map((s) => {
      const structured =
        (s.structuredJson as unknown as StructuredSummary | null) ?? undefined;
      const rendered = renderDailyEmail({
        date: isoDate,
        matchedTopic: s.primaryTopic,
        hasMultipleInterests: false,
        summaryLanguage: s.summaryLanguage,
        article: {
          title: s.pick.articleTitle,
          url: s.pick.article.url,
          sourceName: s.pick.sourceName,
        },
        summary: {
          bodyText: s.bodyText,
          bodyHtml: s.bodyHtml ?? undefined,
          structured,
        },
        links: previewLinks(),
      });
      return {
        id: s.id,
        summaryLanguage: s.summaryLanguage,
        primaryTopic: s.primaryTopic,
        sourceName: s.pick.sourceName,
        confidence: s.confidence,
        generator: s.generator,
        preheader: structured?.preheader ?? "",
        articleUrl: s.pick.article.url,
        demo: isDemoOrManual(s.pick.article),
        rendered,
      };
    });

  // Feedback totals (all-time) for the QA panel.
  const feedbackByReaction: Record<string, number> = {};
  for (const f of feedbackRows) {
    feedbackByReaction[f.reaction] = f._count._all;
  }
  const feedbackTotal = feedbackRows.reduce((n, f) => n + f._count._all, 0);

  const llmStatus = getLlmStatus();
  const resendStatus = getResendStatus();
  const demoActive = isDemoModeEnabled();

  // Group sends into segments: (matchedTopic, summaryLanguage, articleId).
  const segmentMap = new Map<
    string,
    {
      key: string;
      topic: string;
      summaryLanguage: string;
      articleTitle: string;
      sourceName: string;
      pickStatus: string;
      score: number;
      subscriberCount: number;
      statuses: Record<string, number>;
    }
  >();

  for (const s of sends) {
    const key = `${s.matchedTopic}::${s.summaryLanguage}::${s.pick.articleId}`;
    const existing = segmentMap.get(key);
    if (existing) {
      existing.subscriberCount++;
      existing.statuses[s.status] = (existing.statuses[s.status] ?? 0) + 1;
    } else {
      segmentMap.set(key, {
        key,
        topic: s.matchedTopic,
        summaryLanguage: s.summaryLanguage,
        articleTitle: s.pick.articleTitle,
        sourceName: s.pick.sourceName,
        pickStatus: s.pick.status,
        score: s.personalizedScore,
        subscriberCount: 1,
        statuses: { [s.status]: 1 },
      });
    }
  }

  const segments = Array.from(segmentMap.values()).sort(
    (a, b) => b.subscriberCount - a.subscriberCount,
  );

  return (
    <Shell>
      <div className="flex items-baseline justify-between gap-4 mb-8">
        <h1 className="font-serif text-2xl tracking-tight text-ink">
          Editorial preview
        </h1>
        <div className="flex items-center gap-3 text-[12px] text-fog font-sans">
          <a
            href={`/admin/manual-article?token=${encodeURIComponent(token)}`}
            className="text-ink underline underline-offset-2 hover:text-graphite"
          >
            + Add article
          </a>
          <span>·</span>
          <span>{isoDate}</span>
          <span>·</span>
          <span>{totalSubs} active subscribers</span>
        </div>
      </div>

      {/* Development preview banner */}
      {(!llmStatus.configured || !resendStatus.hasApiKey || demoActive) && (
        <div className="mb-8 rounded-xl border border-line-strong bg-cream/60 px-5 py-4 text-[13px] text-ink font-sans">
          <span className="font-medium">Development preview.</span>{" "}
          {!llmStatus.configured
            ? "Real LLM is not configured (summaries use heuristic-dev). "
            : ""}
          {!resendStatus.hasApiKey
            ? "Resend is not configured (emails are render-only, nothing is sent). "
            : ""}
          {demoActive
            ? "DEMO MODE is enabled — relaxed preview thresholds are in use; production thresholds are unchanged. "
            : ""}
          Output here is for testing and is not production-ready quality.
        </div>
      )}

      {/* Launch readiness */}
      <Section
        title="Launch readiness"
        subtitle={`${readiness.filter((c) => c.status === "pass").length}/${readiness.length} pass`}
      >
        <Table
          head={["Variable", "Status", "Explanation"]}
          rows={readiness.map((c) => [
            <span key="k" className="font-mono text-[11.5px] text-ash">
              {c.key}
            </span>,
            <ReadinessBadge key="s" status={c.status} />,
            <span key="e" className="text-[12.5px] text-ink/80">
              {c.explanation}
            </span>,
          ])}
        />
      </Section>

      {/* Section 0 — System status */}
      <Section title="System" subtitle="Provider + threshold configuration">
        <Table
          head={["Setting", "Value", "Note"]}
          rows={[
            [
              "AI provider",
              <span key="p" className="font-mono text-[11.5px] text-ash">
                {llmStatus.provider} · {llmStatus.model}
              </span>,
              llmStatus.configured ? (
                <span className="text-ink">configured</span>
              ) : (
                <span className="text-dawn">
                  not configured · summaries will be REJECTED in production
                </span>
              ),
            ],
            [
              "OpenAI key",
              llmStatus.hasOpenAiKey ? "set" : "—",
              llmStatus.provider === "openai" && !llmStatus.hasOpenAiKey
                ? <span key="w" className="text-dawn">missing</span>
                : "—",
            ],
            [
              "Anthropic key",
              llmStatus.hasAnthropicKey ? "set" : "—",
              llmStatus.provider === "anthropic" && !llmStatus.hasAnthropicKey
                ? <span key="w" className="text-dawn">missing</span>
                : "—",
            ],
            [
              "Resend",
              resendStatus.hasApiKey ? "key set" : "no key",
              resendStatus.usingFallbackSender ? (
                <span className="text-dawn">
                  using fallback sender — set FROM_EMAIL
                </span>
              ) : (
                <span className="font-mono text-[11.5px] text-ash">
                  {resendStatus.from}
                </span>
              ),
            ],
            [
              "Thresholds",
              <span key="t" className="font-mono text-[11.5px] text-ash">
                article ≥ {MIN_ARTICLE_SCORE} · delivery ≥ {MIN_DELIVERY_SCORE} · summary ≥ {MIN_SUMMARY_CONFIDENCE} · extract ≥ {MIN_EXTRACTION_CONFIDENCE}
              </span>,
              "tune via env",
            ],
          ]}
        />
      </Section>

      {/* Section 1 — Daily topic pool */}
      <Section title="Daily topic pool" subtitle={`${picks.length} picks`}>
        {picks.length === 0 ? (
          <Empty>No picks for this date yet. Run the daily pipeline.</Empty>
        ) : (
          <Table
            head={["Topic", "Source lang", "Article", "Source", "Score", "Status", "Labels", "Reason"]}
            rows={picks.map((p) => [
              topicBySlug(p.topic)?.label ?? p.topic,
              p.sourceLanguage,
              p.articleTitle,
              p.sourceName,
              p.score.toFixed(2),
              <StatusBadge key="s" value={p.status} />,
              <span key="labels" className="inline-flex flex-wrap gap-1">
                {isDemoOrManual(p.article) ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-line text-[10px] uppercase tracking-eyebrow text-dawn">
                    {p.article.sourceName === "One Read Demo" ? "demo-mode pick" : "manual pick"}
                  </span>
                ) : (
                  "—"
                )}
              </span>,
              p.reasonForSelection ?? "—",
            ])}
          />
        )}
      </Section>

      {/* Section 2 — Summaries */}
      <Section
        title="Summaries"
        subtitle={`${summaries.length} for this date · ${summaries.filter((s) => s.status === "READY").length} ready`}
      >
        {summaries.some((s) => isHeuristicGenerator(s.generator)) && (
          <div className="px-4 py-3 bg-cream/60 border-b border-line text-[12.5px] text-dawn font-sans">
            ⚠ Some summaries below were produced by the dev heuristic
            (<code>heuristic-dev</code>), not a real LLM. This is development
            output and is not production-ready quality.
          </div>
        )}
        {summaries.length === 0 ? (
          <Empty>No summaries generated for this date yet.</Empty>
        ) : (
          <Table
            head={[
              "Article",
              "Lang",
              "Topic",
              "Status",
              "Confidence",
              "Generator",
              "Notes",
            ]}
            rows={summaries.map((s) => {
              const structured = s.structuredJson as
                | { editorNotes?: string; subject?: string }
                | null;
              return [
                <span key="a" className="text-ink/90">
                  {s.pick.articleTitle}
                  {structured?.subject ? (
                    <span className="block text-[11.5px] text-fog mt-0.5 italic">
                      “{structured.subject}”
                    </span>
                  ) : null}
                </span>,
                s.summaryLanguage,
                topicBySlug(s.primaryTopic)?.label ?? s.primaryTopic,
                <StatusBadge key="s" value={s.status} />,
                s.confidence != null ? s.confidence.toFixed(0) : "—",
                <span key="g" className="font-mono text-[11.5px] text-ash">
                  {s.generator ?? "—"}
                  {isHeuristicGenerator(s.generator) ? (
                    <span className="ml-1 text-dawn not-italic">· dev</span>
                  ) : null}
                </span>,
                <span key="n" className="text-[11.5px] text-ash">
                  {isHeuristicGenerator(s.generator)
                    ? "Development summary, not real LLM output. "
                    : ""}
                  {s.rejectionReason ?? structured?.editorNotes ?? "—"}
                </span>,
              ];
            })}
          />
        )}
      </Section>

      {/* Section 2b — Email preview (rendering only, never sends) */}
      <Section
        title="Email preview"
        subtitle={`${emailPreviews.length} READY summaries · rendering only, no send`}
      >
        {emailPreviews.length === 0 ? (
          <Empty>
            No READY summaries to preview. Seed demo articles, run scoring, then
            the pipeline.
          </Empty>
        ) : (
          <div className="divide-y divide-line">
            {emailPreviews.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3 text-[12.5px]">
                  <span className="font-serif text-ink text-[15px]">
                    {p.rendered.subject}
                  </span>
                  <span className="text-fog">
                    {topicBySlug(p.primaryTopic)?.label ?? p.primaryTopic} ·{" "}
                    {p.summaryLanguage} · {p.sourceName}
                  </span>
                  <span className="text-ash">
                    confidence {p.confidence ?? "—"}
                  </span>
                  <span className="font-mono text-[11px] text-ash">
                    {p.generator ?? "—"}
                    {isHeuristicGenerator(p.generator) ? (
                      <span className="text-dawn"> · dev</span>
                    ) : null}
                  </span>
                  {p.demo ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-line text-[10px] uppercase tracking-eyebrow text-dawn">
                      demo-mode pick
                    </span>
                  ) : null}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-line text-[10px] uppercase tracking-eyebrow text-fog">
                    render-only · not sent
                  </span>
                </div>
                {p.preheader ? (
                  <div className="mb-2 text-[12px] text-fog font-sans">
                    Preheader: {p.preheader}
                  </div>
                ) : null}
                <div className="mb-2 text-[12px] font-sans">
                  <a
                    href={p.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline underline-offset-2"
                  >
                    Original article ↗
                  </a>
                </div>
                <iframe
                  title={`email-${p.id}`}
                  srcDoc={p.rendered.html}
                  className="w-full h-[460px] rounded-lg border border-line bg-white"
                />
                <details className="mt-2">
                  <summary className="cursor-pointer text-[12px] text-fog font-sans">
                    Plain-text version
                  </summary>
                  <pre className="mt-2 p-3 bg-paper/70 rounded-lg border border-line text-[11.5px] text-ink/80 whitespace-pre-wrap font-mono overflow-x-auto">
                    {p.rendered.text}
                  </pre>
                </details>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[12px] text-fog font-sans">
                    Email links (preview)
                  </summary>
                  <ul className="mt-2 text-[11.5px] text-ash font-mono break-all space-y-1">
                    <li>loved: {previewLinks().feedbackLoved}</li>
                    <li>not for me: {previewLinks().feedbackDisliked}</li>
                    <li>unsubscribe: {previewLinks().unsubscribe}</li>
                  </ul>
                </details>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Section 3 — Segments */}
      <Section
        title="Segment / delivery mapping"
        subtitle={`${segments.length} segments · ${sends.length} sends`}
      >
        {segments.length === 0 ? (
          <Empty>No sends for this date yet.</Empty>
        ) : (
          <Table
            head={["Segment", "Subscribers", "Article", "Source", "Score", "Statuses"]}
            rows={segments.map((s) => [
              <span key="k" className="font-mono text-[11.5px] text-ash">
                {topicBySlug(s.topic)?.label ?? s.topic} · {s.summaryLanguage}
              </span>,
              s.subscriberCount,
              s.articleTitle,
              s.sourceName,
              s.score.toFixed(2),
              <span key="st" className="text-[11.5px] text-ash">
                {Object.entries(s.statuses)
                  .map(([k, v]) => `${k}:${v}`)
                  .join("  ·  ")}
              </span>,
            ])}
          />
        )}
      </Section>

      {/* Section 3b — Feedback (all-time) */}
      <Section
        title="Feedback"
        subtitle={`${feedbackTotal} total reactions`}
      >
        {feedbackTotal === 0 ? (
          <Empty>No feedback recorded yet.</Empty>
        ) : (
          <Table
            head={["Loved", "Liked", "Meh", "Not for me"]}
            rows={[
              [
                feedbackByReaction.loved ?? 0,
                feedbackByReaction.liked ?? 0,
                feedbackByReaction.meh ?? 0,
                feedbackByReaction.disliked ?? 0,
              ],
            ]}
          />
        )}
      </Section>

      {/* Section 4 — Sources */}
      <Section
        title="Sources"
        subtitle={`${sources.filter((s) => s.active).length} active · ${sources.length} total`}
      >
        {sources.length === 0 ? (
          <Empty>
            No sources configured. Run <code>npm run db:seed-sources</code>.
          </Empty>
        ) : (
          <Table
            head={["Slug", "Name", "Topic", "Active", "Last fetched", "Last error"]}
            rows={sources.map((s) => [
              <span key="k" className="font-mono text-[11.5px] text-ash">
                {s.slug}
              </span>,
              s.name,
              topicBySlug(s.defaultTopic)?.label ?? s.defaultTopic,
              s.active ? "Yes" : "—",
              s.lastFetchedAt
                ? s.lastFetchedAt.toISOString().slice(0, 16).replace("T", " ")
                : "never",
              <span key="e" className="text-[11.5px] text-dawn">
                {s.lastError ?? "—"}
              </span>,
            ])}
          />
        )}
      </Section>

      {/* Section 5 — Recent ingestion (last 30 articles) */}
      <Section
        title="Recent ingestion"
        subtitle={`${recentArticles.length} articles`}
      >
        {recentArticles.length === 0 ? (
          <Empty>No articles ingested yet.</Empty>
        ) : (
          <Table
            head={[
              "Title",
              "Source",
              "Topic",
              "Status",
              "Quality",
              "Extract",
              "Reason",
              "Preview",
            ]}
            rows={recentArticles.map((a) => [
              <span key="t">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink hover:underline"
                >
                  {a.title}
                </a>
                {isDemoOrManual(a) ? (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full border border-line text-[10px] uppercase tracking-eyebrow text-dawn align-middle">
                    {a.sourceName === "One Read Demo" ? "demo" : "manual"}
                  </span>
                ) : null}
              </span>,
              a.sourceName,
              topicBySlug(a.topic)?.label ?? a.topic,
              <StatusBadge key="s" value={a.scoringStatus} />,
              a.qualityScore.toFixed(2),
              a.extractionConfidence != null
                ? a.extractionConfidence.toFixed(2)
                : "—",
              <span key="r" className="text-[11.5px] text-ash">
                {a.rejectionReason ?? a.reasonForSelection ?? "—"}
              </span>,
              isDemoOrManual(a) && a.scoringStatus === "SCORED" ? (
                <PreviewPickButton key="pp" articleId={a.id} token={token} />
              ) : (
                "—"
              ),
            ])}
          />
        )}
      </Section>
    </Shell>
  );
}

/* ----------------------------------------------------------------------- */
/* UI primitives — keep visual identity calm and editorial                  */
/* ----------------------------------------------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-svh w-full px-5 sm:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 text-center">
          <span className="font-serif italic uppercase tracking-wordmark text-[12px] text-ink/85">
            One&nbsp;·&nbsp;Read · admin
          </span>
        </div>
        {children}
      </div>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-[18px] text-ink">{title}</h2>
        {subtitle && (
          <span className="text-[11.5px] text-fog font-sans">{subtitle}</span>
        )}
      </div>
      <div className="border border-line rounded-xl bg-paper/60 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-10 text-center text-[13px] text-fog font-sans">
      {children}
    </div>
  );
}

function Table({
  head,
  rows,
}: {
  head: readonly string[];
  rows: readonly (readonly React.ReactNode[])[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-eyebrow text-fog">
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-sans font-normal whitespace-nowrap border-b border-line"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/60 last:border-b-0 hover:bg-cream/40 transition-colors">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 align-top text-ink/90 font-sans"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const map: Record<string, string> = {
    READY: "bg-cream/80 text-ink border-line-strong",
    DRAFT: "bg-paper text-ash border-line",
    SENT: "bg-ink text-paper border-ink",
    REJECTED: "bg-paper text-dawn border-line",
    QUEUED: "bg-paper text-ash border-line",
    FAILED: "bg-paper text-dawn border-line",
    SKIPPED: "bg-paper text-fog border-line",
  };
  const cls = map[value] ?? "bg-paper text-ash border-line";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] uppercase tracking-eyebrow ${cls}`}
    >
      {value}
    </span>
  );
}

function todayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Non-functional placeholder links for the email preview (no real send). */
function previewLinks() {
  const base =
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://oneread.app";
  return {
    feedbackLoved: `${base}/api/feedback?preview=1&r=loved`,
    feedbackLiked: `${base}/api/feedback?preview=1&r=liked`,
    feedbackMeh: `${base}/api/feedback?preview=1&r=meh`,
    feedbackDisliked: `${base}/api/feedback?preview=1&r=disliked`,
    unsubscribe: `${base}/unsubscribe?preview=1`,
  };
}

function ReadinessBadge({ status }: { status: ReadinessStatus }) {
  const map: Record<ReadinessStatus, string> = {
    pass: "bg-cream/80 text-ink border-line-strong",
    warn: "bg-paper text-dawn border-line",
    missing: "bg-paper text-dawn border-line-strong",
  };
  const label = status === "pass" ? "PASS" : status === "warn" ? "WARN" : "MISSING";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] uppercase tracking-eyebrow ${map[status]}`}
    >
      {label}
    </span>
  );
}
