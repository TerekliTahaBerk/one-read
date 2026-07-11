import Link from "next/link";
import { guardAdminPage } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { HealthHeadline, FactList, type Health } from "@/components/admin/HealthCard";
import { Details } from "@/components/admin/Details";
import { oneFilmTabs } from "@/lib/admin/nav";
import { getFilmOverviewMetrics } from "@/lib/admin/film-queries";
import { getFilmHealth, aiBrainWorking } from "@/lib/admin/health";
import { filmBillingConfigured, filmCronEnabled, filmRequireApproval, filmSourceMode } from "@/lib/film/config";
import { getLlmStatus } from "@/lib/llm";
import { FILM_PROMPT_VERSION } from "@/lib/film/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OneFilmOverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/one-film", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [m, health] = await Promise.all([getFilmOverviewMetrics(), getFilmHealth()]);
  const llm = getLlmStatus();
  const cronOn = filmCronEnabled();
  const aiOk = aiBrainWorking();

  const nextAction = !cronOn
    ? "Turn on automatic sending when you're ready to deliver"
    : m.issues.approvedOrScheduled > 0
      ? "Today's note is ready to go"
      : "Prepare and approve today's film note";

  return (
    <AdminShell title="OneFilm" subtitle="One thoughtful film note, delivered weekly">
      <AdminTabs tabs={oneFilmTabs()} active="overview" />

      <AdminCard bodyClassName="p-4">
        <HealthHeadline health={health.health as Health} headline={health.headline} detail={nextAction} />
      </AdminCard>

      <AdminCard title="At a glance" bodyClassName="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FactList
            rows={[
              ["Today's note", m.issues.approvedOrScheduled > 0 ? "Ready" : m.issues.total > 0 ? "Being prepared" : "Nothing yet"],
              ["Automatic sending", cronOn ? "On" : "Off"],
              ["AI brain", aiOk ? "Working" : "Needs setup"],
            ]}
          />
          <FactList
            rows={[
              ["Subscribers ready", `${m.subscribers.eligible}`],
              ["Films in library", `${m.catalog.total}`],
              ["Payments", filmBillingConfigured() ? "Connected" : "Needs setup"],
            ]}
          />
        </div>
      </AdminCard>

      <AdminCard title="Subscribers" bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Total" value={m.subscribers.total} />
          <MetricCard label="Ready to receive" value={m.subscribers.eligible} tone="good" />
          <MetricCard label="Setting up" value={m.subscribers.pendingPreferences} />
          <MetricCard label="Awaiting payment" value={m.subscribers.pendingCheckout} />
          <MetricCard label="Active / trialing" value={m.subscribers.activeOrTrialing} tone="good" />
          <MetricCard label="Unsubscribed" value={m.subscribers.paused} />
          <MetricCard label="Bounced / blocked" value={m.subscribers.suppressed} tone={m.subscribers.suppressed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>

      <AdminCard title={`Today's delivery · ${m.isoDate}`} bodyClassName="p-4">
        <MetricGrid>
          <MetricCard label="Notes prepared" value={m.issues.total} />
          <MetricCard label="Approved / scheduled" value={m.issues.approvedOrScheduled} />
          <MetricCard label="No film available" value={m.issues.noFilm} tone={m.issues.noFilm > 0 ? "warn" : "default"} />
          <MetricCard label="Delivered" value={m.sends.sent} tone="good" />
          <MetricCard label="Skipped" value={m.sends.skipped} />
          <MetricCard label="Failed" value={m.sends.failed} tone={m.sends.failed > 0 ? "warn" : "default"} />
        </MetricGrid>
      </AdminCard>

      <div className="mb-8 flex flex-wrap gap-3 text-[13px] font-sans">
        <Link href="/admin/one-film/issues" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Notes</Link>
        <Link href="/admin/one-film/catalog" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Catalog</Link>
        <Link href="/admin/one-film/subscribers" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Subscribers</Link>
        <Link href="/admin/one-film/sends" className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-admin-ink hover:bg-admin-sink">Send logs</Link>
      </div>

      <Details summary="Technical details — configuration and AI brain">
        <div className="space-y-6">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">Configuration</div>
            <MetricGrid>
              <MetricCard label="Polar product" value={filmBillingConfigured() ? "Configured" : "Missing"} tone={filmBillingConfigured() ? "good" : "warn"} />
              <MetricCard label="Cron" value={cronOn ? "Enabled" : "Disabled"} />
              <MetricCard label="Approval required" value={filmRequireApproval() ? "Yes" : "No"} />
              <MetricCard label="Source mode" value={filmSourceMode()} />
            </MetricGrid>
          </div>
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-eyebrow text-admin-muted">Gemini brain</div>
            <MetricGrid>
              <MetricCard label="Model" value={llm.provider === "gemini" ? `Gemini · ${llm.model}` : llm.model} />
              <MetricCard label="Metadata grounding" value="Enabled" tone="good" />
              <MetricCard label="NO_FILM guard" value="Enabled" tone="good" />
              <MetricCard label="Spoiler control" value="Enabled" tone="good" />
              <MetricCard label="Streaming availability" value="Never invented" />
              <MetricCard label="Prompt version" value={FILM_PROMPT_VERSION} />
            </MetricGrid>
            <p className="mt-3 text-[12px] text-admin-body font-sans">
              Factual fields (title, year, director, runtime, language) are copied from the catalog entry — never written by the model. Ratings, awards, and streaming availability are never invented.
            </p>
          </div>
        </div>
      </Details>
    </AdminShell>
  );
}
