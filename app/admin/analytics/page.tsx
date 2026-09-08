import Link from "next/link";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { guardAdminPage } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { getLaunchHealth, LAUNCH_HEALTH_OFFERS, type LaunchHealthOffer } from "@/lib/admin/launch-health";
import { ANALYTICS_EVENTS, type AnalyticsEvent } from "@/lib/analytics";
import { AdminTable } from "@/components/admin/AdminTable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LABELS: Record<LaunchHealthOffer, string> = { all: "All offers", "one-article": "OneArticle", "one-news": "OneNews", "one-read": "Bundle" };

/**
 * What each browser event means, and whether this panel can answer it from its
 * own database. Every event in the taxonomy must appear here — the Record type
 * makes adding one to `ANALYTICS_EVENTS` a compile error until it is described.
 */
const BROWSER_EVENTS: Record<AnalyticsEvent, { meaning: string; firstParty: string | null }> = {
  public_sample_viewed: { meaning: "A sample edition was opened on the public site.", firstParty: null },
  one_news_sample_viewed: { meaning: "A OneNews sample was opened.", firstParty: null },
  subscribe_cta_clicked: { meaning: "A subscribe call to action was clicked.", firstParty: null },
  offer_selected: { meaning: "An offer was chosen on the pricing page.", firstParty: null },
  billing_interval_selected: { meaning: "Monthly or annual was chosen.", firstParty: null },
  verification_requested: { meaning: "A verification code was requested.", firstParty: "Users — verification requests" },
  email_verified: { meaning: "A verification code was completed.", firstParty: "Users — verified emails" },
  product_preferences_saved: { meaning: "Preferences were saved for a product.", firstParty: "Users — selections" },
  preferences_completed: { meaning: "All required preferences were completed.", firstParty: "Users — selections" },
  checkout_started: { meaning: "Checkout was opened.", firstParty: "Launch health — checkout stage" },
  checkout_failed: { meaning: "Checkout returned an error.", firstParty: "Operator queue — billing" },
  product_email_unsubscribed: { meaning: "A product email was switched off.", firstParty: "Users — email delivery" },
  product_email_resubscribed: { meaning: "A product email was switched back on.", firstParty: "Users — email delivery" },
  email_unsubscribed: { meaning: "All email was switched off.", firstParty: "Users — email delivery" },
  email_resubscribed: { meaning: "All email was switched back on.", firstParty: "Users — email delivery" },
};

export default async function LaunchHealthPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/analytics", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const requested = typeof searchParams.offer === "string" ? searchParams.offer : "all";
  const offer: LaunchHealthOffer = (LAUNCH_HEALTH_OFFERS as readonly string[]).includes(requested) ? requested as LaunchHealthOffer : "all";
  const snapshot = await getLaunchHealth(offer);
  const hasFailure = Object.values(snapshot.failures).some((count) => count > 0);

  return <AdminShell title="Launch health" subtitle="Signup → paid → first-delivery operational evidence">
    <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter by offer">
      {LAUNCH_HEALTH_OFFERS.map((key) => <Link key={key} href={key === "all" ? "/admin/analytics" : `/admin/analytics?offer=${key}`} aria-current={offer === key ? "page" : undefined} className={`rounded-full border px-4 py-2 text-[12px] ${offer === key ? "border-admin-ink bg-admin-ink text-white" : "border-admin-line bg-white text-admin-body"}`}>{LABELS[key]}</Link>)}
    </div>
    <AdminCard title={`${LABELS[offer]} canonical funnel`} subtitle="Durable server evidence; counts are current all-time launch totals, not browser sessions." bodyClassName="p-4">
      <MetricGrid>{snapshot.stages.map((stage, index) => <MetricCard key={stage.key} label={`${index + 1}. ${stage.label}`} value={stage.count} hint={stage.evidence} tone={stage.key === "entitlement" || stage.key === "first_delivery" ? "good" : "default"} />)}</MetricGrid>
    </AdminCard>
    <AdminCard title="Failure and reconciliation counters" subtitle="Any non-zero value is an operator decision signal." bodyClassName="p-4">
      <MetricGrid>
        <MetricCard label="7. Delivery failed" value={snapshot.failures.deliveryFailed} tone={snapshot.failures.deliveryFailed ? "warn" : "good"} />
        <MetricCard label="Reconciliation required" value={snapshot.failures.reconciliationRequired} tone={snapshot.failures.reconciliationRequired ? "warn" : "good"} />
        <MetricCard label="Unprocessed billing events" value={snapshot.failures.unprocessedBillingEvents} tone={snapshot.failures.unprocessedBillingEvents ? "warn" : "good"} />
        <MetricCard label="Failed / partial runs" value={snapshot.failures.failedOperationalRuns} tone={snapshot.failures.failedOperationalRuns ? "warn" : "good"} />
      </MetricGrid>
      <p className={`mt-4 text-[13px] ${hasFailure ? "text-dawn" : "text-emerald-700"}`}>{hasFailure ? "Launch chain needs operator attention." : "No recorded failure signal in the selected scope."}</p>
    </AdminCard>
    <AdminCard
      title="Browser funnel"
      subtitle="Anonymous page and click events are recorded by Vercel Analytics, not by this database — so the panel can tell you what is measured and where to read it, but not the counts."
    >
      <AdminTable
        head={["Event", "What it means", "Answerable from this panel"]}
        empty="No browser events are defined."
        rows={ANALYTICS_EVENTS.map((event) => {
          const row = BROWSER_EVENTS[event];
          return [
            <span key="e" className="font-medium text-admin-ink">{event.replace(/_/g, " ")}</span>,
            row.meaning,
            row.firstParty ?? (
              <span key="ext" className="text-admin-muted">
                No — anonymous, pre-signup. Vercel Analytics only.
              </span>
            ),
          ];
        })}
      />
    </AdminCard>

    <AdminCard title="Freshness and interpretation"><DefList rows={[
      ["Snapshot generated", fmtDateTime(snapshot.generatedAt)],
      ["Latest operational run", snapshot.latestRun ? <span key="run"><StatusBadge value={snapshot.latestRun.status} /> · {snapshot.latestRun.productKey} · {fmtDateTime(snapshot.latestRun.finishedAt ?? snapshot.latestRun.startedAt)}</span> : "No run recorded"],
      ["Stages 1–3", "Verification and setup records in Postgres; historical verification rows without an offer remain visible only in All offers."],
      ["Stages 4–6", "Polar-confirmed subscription state and canonical OneArticle / OneNews delivery records."],
      ["Browser analytics", "Vercel Analytics is for CTA and UI drop-off only; it is not used as payment, entitlement, or delivery truth."],
      ["Infrastructure", "Vercel Observability / Speed Insights and Sentry remain the infrastructure and exception drill-down surfaces."],
    ]} /></AdminCard>
  </AdminShell>;
}
