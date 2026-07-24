import { guardAdminPage, adminLoginConfigured } from "@/lib/admin/auth";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList, MetricCard, MetricGrid } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SettingToggle } from "@/components/admin/SettingToggle";
import { getControls, SETTING_KEYS } from "@/lib/admin/settings-store";
import { getResendStatus } from "@/lib/resend";
import { oneReadBillingConfigured } from "@/lib/oneread/config";
import {
  emailVerificationSecretConfigured,
  verificationEmailConfigured,
} from "@/lib/one-article/verification";
import { prisma } from "@/lib/prisma";
import { fmtDateTime } from "@/lib/admin/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/settings", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;

  const [controls, latestRun, scheduled, failed] = await Promise.all([
    getControls(),
    prisma.operationalRun.findFirst({
      where: { productKey: "one-article" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.oneArticleIssue.count({ where: { status: "SCHEDULED" } }),
    prisma.oneArticleDelivery.count({ where: { status: "FAILED" } }),
  ]);
  const resend = getResendStatus();
  const paymentsReady =
    oneReadBillingConfigured() && Boolean(process.env.POLAR_ACCESS_TOKEN);
  const checks: [string, boolean, string][] = [
    ["Email delivery", resend.hasApiKey, resend.hasApiKey ? resend.from : "RESEND_API_KEY missing"],
    ["Verified sender", !resend.usingFallbackSender, resend.usingFallbackSender ? "Development fallback sender" : resend.from],
    ["OneRead payments", paymentsReady, paymentsReady ? "OneArticle-only checkout configured" : "Polar token or OneRead product missing"],
    ["Payment webhooks", Boolean(process.env.POLAR_WEBHOOK_SECRET), process.env.POLAR_WEBHOOK_SECRET ? "Signature verification configured" : "POLAR_WEBHOOK_SECRET missing"],
    ["Email verification", emailVerificationSecretConfigured() && verificationEmailConfigured(), emailVerificationSecretConfigured() && verificationEmailConfigured() ? "Codes can be delivered" : "Verification secret or delivery missing"],
    ["Cron security", Boolean(process.env.CRON_SECRET), process.env.CRON_SECRET ? "Protected" : "CRON_SECRET missing"],
    ["Admin login", adminLoginConfigured(), adminLoginConfigured() ? "Configured" : "Credentials or session secret missing"],
  ];

  return (
    <AdminShell title="Settings" subtitle="OneArticle delivery and launch readiness">
      <AdminCard title="Delivery control" subtitle="Cron checks for due editions every ten minutes">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[13.5px] font-medium text-admin-ink">Automatic dispatch</div>
              <p className="mt-1 text-[12.5px] text-admin-muted">
                Only editions explicitly scheduled in the editorial panel can be sent.
              </p>
            </div>
            <SettingToggle
              settingKey={SETTING_KEYS.oneArticleCron}
              initial={controls.oneArticle.cronEnabled}
              onLabel="Enabled"
              offLabel="Paused"
              confirmOn="Enable automatic OneArticle dispatch? Due scheduled editions will be emailed to eligible subscribers."
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-admin-line pt-5">
            <div>
              <div className="text-[13.5px] font-medium text-admin-ink">Delivery mode</div>
              <p className="mt-1 text-[12.5px] text-admin-muted">
                Preview mode keeps scheduled editions queued and sends no subscriber email.
              </p>
            </div>
            <SettingToggle
              settingKey={SETTING_KEYS.oneArticleDryRun}
              initial={controls.oneArticle.dryRun}
              onLabel="Preview only"
              offLabel="Live delivery"
              confirmOff="Switch OneArticle to live delivery? The next cron check can send every due scheduled edition."
            />
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Current operations">
        <MetricGrid>
          <MetricCard label="Scheduled editions" value={scheduled} tone={scheduled > 0 ? "good" : "default"} />
          <MetricCard label="Failed deliveries" value={failed} tone={failed > 0 ? "warn" : "default"} />
          <MetricCard label="Cron interval" value="10 min" />
          <MetricCard label="Timezone" value="Europe/Istanbul" />
        </MetricGrid>
        <DefList
          rows={[
            ["Content mode", "Manual editorial — no RSS or AI generation"],
            ["Delivery mode", controls.oneArticle.dryRun ? "Preview only — subscriber delivery blocked" : "Live"],
            ["Latest cron run", latestRun ? `${fmtDateTime(latestRun.startedAt)} · ${latestRun.status}` : "No run recorded"],
            ["Inactive products", "OneFilm and OneLingo — waitlist only"],
          ]}
        />
      </AdminCard>

      <AdminCard title="Launch readiness" subtitle="Secret values are never displayed">
        <DefList
          rows={checks.map(([label, ok, detail]) => [
            label,
            <span key={label} className="flex items-center justify-end gap-2">
              <span className="text-[12px] text-admin-muted">{detail}</span>
              <StatusBadge value={ok ? "Ready" : "Needs setup"} tone={ok ? "good" : "wait"} />
            </span>,
          ])}
        />
      </AdminCard>

      <AdminCard title="Safety guarantees">
        <ul className="space-y-2 text-[12.5px] text-admin-body">
          <li>• Draft and ready editions are never sent until a delivery time is scheduled.</li>
          <li>• Every recipient delivery has a stable provider idempotency key.</li>
          <li>• Unsubscribed, suppressed, unpaid, or language-incomplete contacts are excluded.</li>
          <li>• OneFilm and OneLingo generation, checkout, and delivery endpoints are disabled.</li>
        </ul>
      </AdminCard>
    </AdminShell>
  );
}
