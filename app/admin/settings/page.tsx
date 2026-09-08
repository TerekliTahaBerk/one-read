import { guardAdminPage, adminLoginConfigured } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SettingToggle } from "@/components/admin/SettingToggle";
import { SettingNumber } from "@/components/admin/SettingNumber";
import { SettingDays } from "@/components/admin/SettingDays";
import { describeSettings, SETTING_KEYS, type SettingKey, type SettingSource } from "@/lib/admin/settings-store";
import { getResendStatus } from "@/lib/resend";
import { oneReadBillingConfigured } from "@/lib/oneread/config";
import { emailVerificationSecretConfigured, verificationEmailConfigured } from "@/lib/one-article/verification";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Plain-English name for each control, used in the effective-value table. */
const CONTROL_LABEL: Record<SettingKey, string> = {
  [SETTING_KEYS.oneArticleCron]: "OneArticle — automatic dispatch",
  [SETTING_KEYS.oneArticleDryRun]: "OneArticle — preview-only delivery",
  [SETTING_KEYS.oneArticleApproval]: "Automated pipeline — approval required",
  [SETTING_KEYS.oneArticleSendDays]: "OneArticle — publication days",
  [SETTING_KEYS.oneNewsCron]: "OneNews — automatic dispatch",
  [SETTING_KEYS.oneNewsDryRun]: "OneNews — preview-only delivery",
  [SETTING_KEYS.oneNewsSendDays]: "OneNews — publication days",
  [SETTING_KEYS.minArticleScore]: "Minimum article score",
  [SETTING_KEYS.minSummaryConfidence]: "Minimum summary confidence",
  [SETTING_KEYS.minDeliveryScore]: "Minimum delivery score",
};

const SOURCE_LABEL: Record<SettingSource, string> = {
  panel: "Set in this panel",
  environment: "From deployment configuration",
  default: "Built-in default",
};

const DAY_NAME: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};

/** Values are rendered as an operator reads them, never as stored strings. */
function displayValue(key: SettingKey, value: string): string {
  if (value === "true" || value === "false") {
    const on = value === "true";
    switch (key) {
      case SETTING_KEYS.oneArticleCron:
      case SETTING_KEYS.oneNewsCron:
        return on ? "Enabled" : "Paused";
      case SETTING_KEYS.oneArticleDryRun:
      case SETTING_KEYS.oneNewsDryRun:
        return on ? "Preview only" : "Live delivery";
      default:
        return on ? "Required" : "Not required";
    }
  }
  if (value.includes(",") || DAY_NAME[value]) {
    return value.split(",").map((d) => DAY_NAME[d] ?? d).join(" · ");
  }
  return value;
}

export default async function SettingsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const guard = await guardAdminPage("/admin/settings", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [{ settings, rows, degraded }, latestArticleRun, latestNewsRun, scheduled, failed, newsScheduled] =
    await Promise.all([
      describeSettings(),
      prisma.operationalRun.findFirst({ where: { productKey: "one-article" }, orderBy: { startedAt: "desc" } }),
      prisma.operationalRun.findFirst({ where: { productKey: "one-news" }, orderBy: { startedAt: "desc" } }),
      prisma.oneArticleIssue.count({ where: { status: "SCHEDULED" } }),
      prisma.oneArticleDelivery.count({ where: { status: "FAILED" } }),
      prisma.oneNewsIssue.count({ where: { status: "SCHEDULED" } }),
    ]);
  const controls = settings.controls;
  const resend = getResendStatus();
  const paymentsReady = oneReadBillingConfigured() && Boolean(process.env.POLAR_ACCESS_TOKEN);
  const sentryReady = Boolean(process.env.SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN);
  const checks: [string, boolean, string][] = [
    ["Email delivery", resend.sendReady, resend.sendReady ? resend.from : resend.productionProblems.join(" ")],
    ["Verified sender", !resend.usingFallbackSender, resend.usingFallbackSender ? "Development fallback sender" : resend.from],
    ["Bounce/complaint webhook", Boolean(process.env.RESEND_WEBHOOK_SECRET), process.env.RESEND_WEBHOOK_SECRET ? "Signature verification configured" : "RESEND_WEBHOOK_SECRET missing"],
    ["OneArticle payments", paymentsReady, paymentsReady ? "Polar checkout configured" : "Polar token or OneRead product missing"],
    ["Payment webhooks", Boolean(process.env.POLAR_WEBHOOK_SECRET), process.env.POLAR_WEBHOOK_SECRET ? "Signature verification configured" : "POLAR_WEBHOOK_SECRET missing"],
    ["Email verification", emailVerificationSecretConfigured() && verificationEmailConfigured(), emailVerificationSecretConfigured() && verificationEmailConfigured() ? "Codes can be delivered" : "Verification secret or delivery missing"],
    ["Cron security", Boolean(process.env.CRON_SECRET), process.env.CRON_SECRET ? "Protected" : "CRON_SECRET missing"],
    ["Admin login", adminLoginConfigured(), adminLoginConfigured() ? "Configured" : "Credentials or session secret missing"],
    ["Error monitoring", sentryReady, sentryReady ? "Server and browser reporting configured" : "Sentry DSN missing or partial"],
  ];

  return <AdminShell title="Settings" subtitle="Delivery controls, quality bars, and what is actually running">
    {degraded && (
      <div className="mb-6 rounded-[18px] border border-dawn/40 bg-admin-surface p-4 font-sans text-[13px] leading-5 text-dawn sm:p-5">
        <strong className="font-medium">Saved settings could not be read.</strong> Every
        control below is showing its deployment fallback, not your panel values. Changes
        saved right now may not apply. Check the database connection before enabling
        anything that sends mail.
      </div>
    )}

    <AdminCard title="OneArticle delivery control" subtitle="Cron checks for due editions every ten minutes" bodyClassName="p-5 sm:p-6">
      <div className="space-y-5">
        <ControlRow
          title="Automatic dispatch"
          detail="Only editions explicitly scheduled in the editorial panel can be sent."
        >
          <SettingToggle settingKey={SETTING_KEYS.oneArticleCron} label="OneArticle automatic dispatch" initial={controls.oneArticle.cronEnabled} onLabel="Enabled" offLabel="Paused" confirmOn="Enable automatic OneArticle dispatch? Due scheduled editions will be emailed to eligible subscribers." />
        </ControlRow>
        <ControlRow
          title="Delivery mode"
          detail="Preview mode keeps scheduled editions queued and sends no subscriber email."
          divider
        >
          <SettingToggle settingKey={SETTING_KEYS.oneArticleDryRun} label="OneArticle preview-only delivery mode" initial={controls.oneArticle.dryRun} onLabel="Preview only" offLabel="Live delivery" confirmOff="Switch OneArticle to live delivery? The next cron check can send every due scheduled edition." />
        </ControlRow>
        <ControlRow
          title="Editorial approval"
          detail="Always required, and not a setting: the dispatcher only ever sends an edition an editor has scheduled."
          divider
        >
          <StatusBadge value={<>Always required</>} tone="good" />
        </ControlRow>
        <ControlRow
          title="Publication days"
          detail="Days on which a due edition may actually be dispatched, in the edition's own timezone."
          divider
        >
          <SettingDays settingKey={SETTING_KEYS.oneArticleSendDays} label="OneArticle publication days" initial={settings.oneArticleSendDays} confirm="Change OneArticle publication days? This changes which days scheduled editions are allowed to send." />
        </ControlRow>
      </div>
    </AdminCard>

    <AdminCard title="OneNews delivery control" subtitle="Same dispatcher, same guarantees — controlled here rather than by a redeploy" bodyClassName="p-5 sm:p-6">
      <div className="space-y-5">
        <ControlRow
          title="Automatic dispatch"
          detail="Off by default. Turning this on is the only thing that lets OneNews reach subscribers."
        >
          <SettingToggle settingKey={SETTING_KEYS.oneNewsCron} label="OneNews automatic dispatch" initial={controls.oneNews.cronEnabled} onLabel="Enabled" offLabel="Paused" confirmOn="Enable automatic OneNews dispatch? Due scheduled briefs will be emailed to eligible subscribers." />
        </ControlRow>
        <ControlRow
          title="Delivery mode"
          detail="Preview mode keeps scheduled briefs queued and sends no subscriber email."
          divider
        >
          <SettingToggle settingKey={SETTING_KEYS.oneNewsDryRun} label="OneNews preview-only delivery mode" initial={controls.oneNews.dryRun} onLabel="Preview only" offLabel="Live delivery" confirmOff="Switch OneNews to live delivery? The next cron check can send every due scheduled brief." />
        </ControlRow>
        <ControlRow
          title="Editorial approval"
          detail="Always required, and not a setting: dispatch only claims a brief an editor has marked ready and scheduled."
          divider
        >
          <StatusBadge value={<>Always required</>} tone="good" />
        </ControlRow>
        <ControlRow
          title="Publication days"
          detail="Days on which a due brief may actually be dispatched."
          divider
        >
          <SettingDays settingKey={SETTING_KEYS.oneNewsSendDays} label="OneNews publication days" initial={settings.oneNewsSendDays} confirm="Change OneNews publication days?" />
        </ControlRow>
      </div>
    </AdminCard>

    <AdminCard
      title="Automated article pipeline"
      subtitle="Applied by the scoring and selection pipeline, not by the editorial dispatcher above. Raising a bar sends fewer, better items; lowering it can let weaker material through."
      bodyClassName="p-5 sm:p-6"
    >
      <div className="space-y-5">
        <ControlRow title="Minimum article score" detail="Composite rank an article must reach to become a daily pick. 0 to 1.">
          <SettingNumber settingKey={SETTING_KEYS.minArticleScore} label="Minimum article score" initial={settings.minArticleScore} min={0} max={1} step={0.01} />
        </ControlRow>
        <ControlRow title="Minimum summary confidence" detail="Confidence the summary writer must report before a summary is marked ready. 0 to 100." divider>
          <SettingNumber settingKey={SETTING_KEYS.minSummaryConfidence} label="Minimum summary confidence" initial={settings.minSummaryConfidence} min={0} max={100} step={1} />
        </ControlRow>
        <ControlRow title="Minimum delivery score" detail="Personalized match score a subscriber must reach before an edition is sent to them. 0 to 1." divider>
          <SettingNumber settingKey={SETTING_KEYS.minDeliveryScore} label="Minimum delivery score" initial={settings.minDeliveryScore} min={0} max={1} step={0.01} />
        </ControlRow>
        <ControlRow
          title="Approval required"
          detail="Restricts pipeline runs to picks an admin approved or scheduled. It does not affect the editorial dispatcher, which always requires an editor."
          divider
        >
          <SettingToggle settingKey={SETTING_KEYS.oneArticleApproval} label="Pipeline approval required" initial={controls.oneArticle.requireApproval} onLabel="Required" offLabel="Not required" confirmOff="Stop requiring approval for automated pipeline runs? Any READY pick becomes eligible." />
        </ControlRow>
      </div>
    </AdminCard>

    <AdminCard
      title="What is actually running"
      subtitle="The effective value of every control, and where that value comes from. Deployment and built-in values apply until you set one here."
    >
      <AdminTable
        head={["Control", "Effective value", "Source", "Last changed"]}
        empty="No controls defined."
        rows={rows.map((row) => [
          CONTROL_LABEL[row.key],
          <span key="value" className="font-medium text-admin-ink">{displayValue(row.key, row.value)}</span>,
          <StatusBadge
            key="source"
            // Wrapped so the badge renders the sentence as written instead of
            // title-casing it the way it does for status enums.
            value={<>{SOURCE_LABEL[row.source]}</>}
            tone={row.source === "panel" ? "good" : "neutral"}
          />,
          row.updatedAt ? `${fmtDateTime(row.updatedAt)}${row.updatedBy ? ` · ${row.updatedBy}` : ""}` : "—",
        ])}
      />
    </AdminCard>

    <AdminCard title="Current operations" bodyClassName="p-0">
      <div className="p-4 sm:p-5">
        <MetricGrid>
          <MetricCard label="OneArticle scheduled" value={scheduled} tone={scheduled > 0 ? "good" : "default"} />
          <MetricCard label="OneNews scheduled" value={newsScheduled} tone={newsScheduled > 0 ? "good" : "default"} />
          <MetricCard label="Failed deliveries" value={failed} tone={failed > 0 ? "warn" : "default"} />
          <MetricCard label="Cron interval" value="10 min" />
          <MetricCard label="Timezone" value="Europe/Istanbul" />
        </MetricGrid>
      </div>
      <DefList rows={[
        ["Content mode", "Manual editorial — no autonomous publication"],
        ["OneArticle delivery", controls.oneArticle.dryRun ? "Preview only" : controls.oneArticle.cronEnabled ? "Live" : "Paused"],
        ["OneNews delivery", controls.oneNews.dryRun ? "Preview only" : controls.oneNews.cronEnabled ? "Live" : "Paused"],
        ["Latest OneArticle run", latestArticleRun ? `${fmtDateTime(latestArticleRun.startedAt)} · ${latestArticleRun.status}` : "No run recorded"],
        ["Latest OneNews run", latestNewsRun ? `${fmtDateTime(latestNewsRun.startedAt)} · ${latestNewsRun.status}` : "No run recorded"],
      ]} />
    </AdminCard>

    <AdminCard title="Launch readiness" subtitle="Secret values are never displayed"><DefList rows={checks.map(([label, ok, detail]) => [label, <span key={label} className="flex items-center justify-end gap-2"><span className="text-[12px] text-admin-muted">{detail}</span><StatusBadge value={ok ? "Ready" : "Needs setup"} tone={ok ? "good" : "wait"} /></span>])} /></AdminCard>
    <AdminCard title="Account security" subtitle="Change your own admin password without exposing it to another administrator" bodyClassName="p-5 sm:p-6"><ChangePasswordForm email={guard.session.email} /></AdminCard>
    <AdminCard title="Safety guarantees" bodyClassName="p-5 sm:p-6"><ul className="grid gap-3 text-[12.5px] leading-5 text-admin-body md:grid-cols-2"><li className="flex gap-2"><span className="text-emerald-700">✓</span><span>Draft and ready editions are never sent until a delivery time is scheduled.</span></li><li className="flex gap-2"><span className="text-emerald-700">✓</span><span>Every recipient delivery has a stable provider idempotency key.</span></li><li className="flex gap-2"><span className="text-emerald-700">✓</span><span>Unsubscribed, suppressed, unpaid, or language-incomplete contacts are excluded.</span></li><li className="flex gap-2"><span className="text-emerald-700">✓</span><span>A publication-day change here takes effect on the next cron check — no redeploy.</span></li></ul></AdminCard>
  </AdminShell>;
}

/** One label/description on the left, one control on the right. */
function ControlRow({
  title,
  detail,
  divider,
  children,
}: {
  title: string;
  detail: string;
  divider?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${divider ? "border-t border-admin-line pt-5" : ""}`}>
      <div className="min-w-[min(100%,18rem)] flex-1">
        <div className="text-[13.5px] font-medium text-admin-ink">{title}</div>
        <p className="mt-1 text-[12.5px] text-admin-muted">{detail}</p>
      </div>
      {children}
    </div>
  );
}
