import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { topicBySlug } from "@/lib/topics";

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

  const [picks, sends, totalSubs] = await Promise.all([
    prisma.topicDailyPick.findMany({
      where: { date: targetDate },
      orderBy: [{ topic: "asc" }, { sourceLanguage: "asc" }],
    }),
    prisma.dailySend.findMany({
      where: { date: targetDate },
      include: { pick: true, subscriber: true },
      orderBy: { personalizedScore: "desc" },
    }),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
  ]);

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
          <span>{isoDate}</span>
          <span>·</span>
          <span>{totalSubs} active subscribers</span>
        </div>
      </div>

      {/* Section 1 — Daily topic pool */}
      <Section title="Daily topic pool" subtitle={`${picks.length} picks`}>
        {picks.length === 0 ? (
          <Empty>No picks for this date yet. Run the daily pipeline.</Empty>
        ) : (
          <Table
            head={["Topic", "Source lang", "Article", "Source", "Score", "Status", "Reason"]}
            rows={picks.map((p) => [
              topicBySlug(p.topic)?.label ?? p.topic,
              p.sourceLanguage,
              p.articleTitle,
              p.sourceName,
              p.score.toFixed(2),
              <StatusBadge key="s" value={p.status} />,
              p.reasonForSelection ?? "—",
            ])}
          />
        )}
      </Section>

      {/* Section 2 — Segments */}
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
