import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime, maskEmail } from "@/lib/admin/format";
import {
  loadFeedbackOverview,
  type FeedbackBreakdownRow,
} from "@/lib/admin/feedback-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REACTION_LABEL: Record<string, string> = {
  loved: "Loved it",
  liked: "Liked it",
  meh: "Meh",
  disliked: "Not for me",
};

/** Plain-English verdict for a mean sentiment in [-1, 1]. */
function verdict(score: number | null): { text: string; tone: "good" | "warn" | "default" } {
  if (score === null) return { text: "No reactions yet", tone: "default" };
  if (score >= 0.4) return { text: "Well received", tone: "good" };
  if (score >= 0) return { text: "Mixed", tone: "default" };
  return { text: "Losing readers", tone: "warn" };
}

export default async function AdminFeedbackPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/feedback", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const overview = await loadFeedbackOverview();
  const overall = verdict(overview.last30.score);

  return (
    <AdminShell
      title="Reader reactions"
      subtitle="The one-click reactions readers send from the bottom of each edition"
    >
      <MetricGrid>
        <MetricCard
          label="Last 30 days"
          value={overall.text}
          tone={overall.tone}
          hint={overview.last30.total > 0 ? `${overview.last30.total} reactions` : "Nothing yet"}
        />
        <MetricCard label="Last 7 days" value={overview.last7.total} hint="Reactions received" />
        <MetricCard label="All time" value={overview.totals.total} hint="Reactions received" />
        <MetricCard
          label="Negative (30d)"
          value={overview.last30.meh + overview.last30.disliked}
          tone={overview.last30.meh + overview.last30.disliked > 0 ? "warn" : "default"}
          hint="“Meh” and “Not for me”"
        />
      </MetricGrid>

      <AdminCard title="Reaction mix" subtitle="How the last 30 days compare with all time">
        <AdminTable
          head={["Reaction", "Last 7 days", "Last 30 days", "All time"]}
          empty="No reactions recorded yet."
          rows={(["loved", "liked", "meh", "disliked"] as const).map((reaction) => [
            REACTION_LABEL[reaction],
            overview.last7[reaction],
            overview.last30[reaction],
            overview.totals[reaction],
          ])}
        />
      </AdminCard>

      <BreakdownCard
        title="By topic"
        subtitle="Worst first. A topic sitting in “Losing readers” is a brief worth rewriting, not a bug."
        rows={overview.byTopic}
        columnLabel="Topic"
      />

      <BreakdownCard
        title="By source"
        subtitle="Worst first. A consistently poorly received source is a candidate to disable in Article sources."
        rows={overview.bySource}
        columnLabel="Source"
      />

      <AdminCard title="Latest reactions" subtitle="Most recent first; addresses are masked">
        <AdminTable
          head={["When", "Reaction", "Topic", "Source", "Article", "Reader"]}
          empty="No reactions recorded yet."
          rows={overview.recent.map((row) => [
            fmtDateTime(row.createdAt),
            REACTION_LABEL[row.reaction] ?? row.reaction,
            row.topic ?? "—",
            row.sourceName ?? "—",
            row.articleTitle ?? "—",
            row.subscriberEmail ? maskEmail(row.subscriberEmail) : "—",
          ])}
        />
      </AdminCard>
    </AdminShell>
  );
}

function BreakdownCard({
  title,
  subtitle,
  rows,
  columnLabel,
}: {
  title: string;
  subtitle: string;
  rows: FeedbackBreakdownRow[];
  columnLabel: string;
}) {
  return (
    <AdminCard title={title} subtitle={subtitle}>
      <AdminTable
        head={[columnLabel, "Reactions", "Loved", "Liked", "Meh", "Not for me", "Verdict"]}
        empty="No reactions recorded yet."
        rows={rows.map((row) => {
          const v = verdict(row.score);
          return [
            row.label,
            row.total,
            row.loved,
            row.liked,
            row.meh,
            row.disliked,
            <span key="verdict" className={v.tone === "warn" ? "text-dawn" : undefined}>
              {v.text}
            </span>,
          ];
        })}
      />
    </AdminCard>
  );
}

