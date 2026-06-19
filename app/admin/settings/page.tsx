import { adminFeatureFlags, adminLoginConfigured, guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getLaunchReadiness } from "@/lib/launch-readiness";
import { SEND_HOUR_LOCAL, SEND_TIMEZONE, fmtDateTime } from "@/lib/admin/format";
import { isApprovalRequired } from "@/lib/admin/issues-config";
import { WAITLIST_FORM_URL } from "@/lib/options";
import {
  lingoBillingConfigured,
  lingoCronEnabled,
  lingoDryRunForced,
  lingoRequireApproval,
  lingoSendHourLocal,
  lingoTimezone,
} from "@/lib/lingo/config";
import {
  newsBillingConfigured,
  newsCronEnabled,
  newsRequireApproval,
  newsSourceMode,
} from "@/lib/news/config";
import {
  filmBillingConfigured,
  filmCronEnabled,
  filmRequireApproval,
  filmSourceMode,
} from "@/lib/film/config";
import {
  emailVerificationSecretConfigured,
  verificationConfig,
  verificationEmailConfigured,
} from "@/lib/one-article/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/settings — provider / launch-readiness status and operational config.
 * Only reports configured/missing — never reveals secret values.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const guard = guardAdminPage("/admin/settings", searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const adminSession = guard.session;

  const readiness = getLaunchReadiness();
  const passCount = readiness.filter((c) => c.status === "pass").length;

  // Next scheduled send date (04:00 UTC = 07:00 Europe/Istanbul).
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const today4 = new Date(`${todayIso}T04:00:00Z`);
  const nextSendDate = new Date(now < today4 ? `${todayIso}T00:00:00Z` : Date.now() + 24 * 60 * 60 * 1000);
  nextSendDate.setUTCHours(0, 0, 0, 0);

  const [lastSend, lastFailed, overrideCount, approvedNext] = await Promise.all([
    prisma.dailySend.findFirst({
      where: { status: "SENT", sentAt: { not: null } },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    }),
    prisma.dailySend.findFirst({
      where: { status: "FAILED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, error: true },
    }),
    prisma.productSubscription.count({ where: { adminOverride: true } }),
    prisma.topicDailyPick.count({
      where: { date: nextSendDate, approvalStatus: { in: ["APPROVED", "SCHEDULED"] } },
    }),
  ]);

  const approvalRequired = isApprovalRequired();
  const flags = adminFeatureFlags();
  const tone = (s: string): "good" | "muted" => (s === "pass" ? "good" : "muted");

  // Operational warnings — surfaced plainly, never alarmist.
  const warnings: string[] = [];
  if (approvalRequired && approvedNext === 0) {
    warnings.push(
      `No approved issue for the next scheduled send (${nextSendDate.toISOString().slice(0, 10)}). With approval required, nothing will be sent.`,
    );
  }
  if (process.env.POLAR_SERVER === "production" && process.env.NODE_ENV !== "production") {
    warnings.push("Polar is set to production while the app is not in production mode.");
  }
  if (process.env.BILLING_PROVIDER === "polar" && !process.env.POLAR_WEBHOOK_SECRET) {
    warnings.push("Polar is the billing provider but POLAR_WEBHOOK_SECRET is not set — webhooks cannot be verified.");
  }
  if (overrideCount > 0) {
    warnings.push(`${overrideCount} subscription(s) have an admin override and are eligible regardless of payment.`);
  }
  if (!adminLoginConfigured()) {
    warnings.push("Admin login is not fully configured. Set ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and ADMIN_SESSION_SECRET.");
  }
  if (process.env.ADMIN_TOKEN === "dev-admin-local-7Qk2") {
    warnings.push("Dev admin token detected — replace ADMIN_TOKEN before production.");
  }
  if (process.env.ADMIN_PASSWORD === "taha123") {
    warnings.push("Development password in use. Replace ADMIN_PASSWORD before production.");
  }
  if (!flags.mutationsEnabled) {
    warnings.push("ADMIN_MUTATIONS_ENABLED is false — user/admin mutations are hidden or blocked.");
  }
  if (!flags.sendActionsEnabled) {
    warnings.push("ADMIN_SEND_ACTIONS_ENABLED is false — issue send actions are hidden or blocked.");
  }
  if (!emailVerificationSecretConfigured()) {
    warnings.push("EMAIL_VERIFICATION_SECRET is not set — OneArticle and OneLingo email verification will be unavailable.");
  } else if (!verificationEmailConfigured()) {
    warnings.push("Email verification is configured but RESEND_API_KEY is missing — codes are logged to the server console in development only.");
  }
  if (!lingoBillingConfigured()) {
    warnings.push("POLAR_ONE_LINGO_PRODUCT_ID is missing — OneLingo public pages work, but checkout is disabled.");
  }
  if (!lingoCronEnabled()) {
    warnings.push("ONELINGO_CRON_ENABLED is not true — the OneLingo cron route will refuse scheduled runs.");
  }
  if (!newsBillingConfigured()) {
    warnings.push("POLAR_ONENEWS_PRODUCT_ID is missing — OneNews public pages work, but checkout is disabled.");
  }
  if (!newsCronEnabled()) {
    warnings.push("ONENEWS_CRON_ENABLED is not true — the OneNews cron route will refuse scheduled runs.");
  }
  if (!filmBillingConfigured()) {
    warnings.push("POLAR_ONEFILM_PRODUCT_ID is missing — OneFilm public pages work, but checkout is disabled.");
  }
  if (!filmCronEnabled()) {
    warnings.push("ONEFILM_CRON_ENABLED is not true — the OneFilm cron route will refuse scheduled runs.");
  }
  warnings.push("Pending-checkout users are never eligible for delivery — this is by design.");

  const verifyCfg = verificationConfig();

  return (
    <AdminShell title="Settings" subtitle="Configuration & launch readiness">
      <AdminCard title="Notices">
        <ul className="divide-y divide-line/70">
          {warnings.map((w, i) => (
            <li key={i} className="px-4 py-2.5 text-[12.5px] text-ink/90 font-sans">
              {w}
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminCard title="Operational config">
        <DefList
          rows={[
            ["Daily send time", `${String(SEND_HOUR_LOCAL).padStart(2, "0")}:00 ${SEND_TIMEZONE}`],
            ["Cron schedule", "0 4 * * * (UTC) — matches 07:00 Europe/Istanbul"],
            [
              "Issue approval required",
              <StatusBadge
                key="a"
                value={approvalRequired ? "ON" : "OFF"}
                tone={approvalRequired ? "good" : "muted"}
              />,
            ],
            [
              "Admin mutations",
              <StatusBadge
                key="m"
                value={flags.mutationsEnabled ? "ON" : "OFF"}
                tone={flags.mutationsEnabled ? "good" : "muted"}
              />,
            ],
            [
              "Admin send actions",
              <StatusBadge
                key="send"
                value={flags.sendActionsEnabled ? "ON" : "OFF"}
                tone={flags.sendActionsEnabled ? "good" : "muted"}
              />,
            ],
            ["Admin override subscriptions", String(overrideCount)],
            ["Last successful send recorded", fmtDateTime(lastSend?.sentAt ?? null)],
            [
              "Last failed send",
              lastFailed ? `${fmtDateTime(lastFailed.createdAt)} — ${lastFailed.error ?? "No error text stored"}` : "No failed sends recorded yet",
            ],
          ]}
        />
      </AdminCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
        <ConfigCard
          title="Admin access"
          rows={[
            ["Admin session", "Active"],
            ["Admin session expires", fmtDateTime(adminSession.expiresAt)],
            ["ADMIN_EMAIL", configured(process.env.ADMIN_EMAIL)],
            [
              "ADMIN_PASSWORD_HASH or ADMIN_PASSWORD",
              configured(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD),
            ],
            ["ADMIN_PASSWORD_HASH", configured(process.env.ADMIN_PASSWORD_HASH)],
            [
              "ADMIN_PASSWORD",
              process.env.ADMIN_PASSWORD
                ? process.env.ADMIN_PASSWORD === "taha123"
                  ? "Development password in use"
                  : "Development fallback configured"
                : "Missing",
            ],
            ["ADMIN_SESSION_SECRET", configured(process.env.ADMIN_SESSION_SECRET)],
            ["ADMIN_TOKEN", process.env.ADMIN_TOKEN === "dev-admin-local-7Qk2" ? "Development token in use" : configured(process.env.ADMIN_TOKEN)],
          ]}
        />
        <ConfigCard
          title="Billing / Polar"
          rows={[
            ["BILLING_PROVIDER", process.env.BILLING_PROVIDER ? "Configured from environment" : "Development fallback"],
            ["POLAR_ACCESS_TOKEN", configured(process.env.POLAR_ACCESS_TOKEN)],
            ["POLAR_WEBHOOK_SECRET", configured(process.env.POLAR_WEBHOOK_SECRET)],
            ["POLAR_ONE_ARTICLE_PRODUCT_ID", configured(process.env.POLAR_ONE_ARTICLE_PRODUCT_ID)],
            ["POLAR_ONE_LINGO_PRODUCT_ID", configured(process.env.POLAR_ONE_LINGO_PRODUCT_ID || process.env.POLAR_ONELINGO_PRODUCT_ID)],
            ["POLAR_ONE_ARTICLE_SUCCESS_URL", configured(process.env.POLAR_ONE_ARTICLE_SUCCESS_URL || process.env.POLAR_SUCCESS_URL)],
            ["POLAR_ONE_ARTICLE_RETURN_URL", configured(process.env.POLAR_ONE_ARTICLE_RETURN_URL)],
            ["POLAR_ONE_LINGO_SUCCESS_URL", configured(process.env.POLAR_ONE_LINGO_SUCCESS_URL)],
            ["POLAR_ONE_LINGO_RETURN_URL", configured(process.env.POLAR_ONE_LINGO_RETURN_URL)],
            ["POLAR_ONENEWS_PRODUCT_ID", configured(process.env.POLAR_ONENEWS_PRODUCT_ID || process.env.POLAR_ONE_NEWS_PRODUCT_ID)],
            ["POLAR_ONENEWS_SUCCESS_URL", configured(process.env.POLAR_ONENEWS_SUCCESS_URL)],
            ["POLAR_ONENEWS_RETURN_URL", configured(process.env.POLAR_ONENEWS_RETURN_URL)],
            ["POLAR_ONEFILM_PRODUCT_ID", configured(process.env.POLAR_ONEFILM_PRODUCT_ID || process.env.POLAR_ONE_FILM_PRODUCT_ID)],
            ["POLAR_ONEFILM_SUCCESS_URL", configured(process.env.POLAR_ONEFILM_SUCCESS_URL)],
            ["POLAR_ONEFILM_RETURN_URL", configured(process.env.POLAR_ONEFILM_RETURN_URL)],
            ["POLAR_SERVER", process.env.POLAR_SERVER ? "Configured from environment" : "Development fallback: sandbox"],
            ["Revenue reporting", "Not tracked yet"],
          ]}
        />
        <ConfigCard
          title="Email / Resend"
          rows={[
            ["RESEND_API_KEY", configured(process.env.RESEND_API_KEY)],
            ["FROM_EMAIL / RESEND_FROM", configured(process.env.FROM_EMAIL || process.env.RESEND_FROM)],
            ["Open tracking", "Not implemented"],
            ["Click tracking", "Not implemented"],
          ]}
        />
        <ConfigCard
          title="Email verification"
          rows={[
            ["EMAIL_VERIFICATION_SECRET", emailVerificationSecretConfigured() ? "Configured" : "Missing"],
            ["Verification email sending", verificationEmailConfigured() ? "Configured" : "Missing"],
            ["Code TTL (minutes)", String(verifyCfg.ttlMinutes)],
            ["Resend cooldown (seconds)", String(verifyCfg.resendCooldownSeconds)],
            ["Max attempts", String(verifyCfg.maxAttempts)],
          ]}
        />
        <ConfigCard
          title="AI provider"
          rows={[
            ["AI_PROVIDER", process.env.AI_PROVIDER ? "Configured from environment" : "Development heuristic fallback"],
            ["OPENAI_API_KEY", configured(process.env.OPENAI_API_KEY)],
            ["ANTHROPIC_API_KEY", configured(process.env.ANTHROPIC_API_KEY)],
            ["AI_MODEL", process.env.AI_MODEL ? "Configured from environment" : "Provider default"],
          ]}
        />
        <ConfigCard
          title="Cron / scheduling"
          rows={[
            ["CRON_SECRET", configured(process.env.CRON_SECRET)],
            ["Schedule source", "vercel.json cron + environment"],
            ["OneLingo cron enabled", lingoCronEnabled() ? "Enabled" : "Missing"],
            ["OneLingo dry run forced", lingoDryRunForced() ? "Enabled" : "Off"],
            ["OneLingo approval required", lingoRequireApproval() ? "Enabled" : "Off"],
            ["OneLingo send time", `${String(lingoSendHourLocal()).padStart(2, "0")}:00 ${lingoTimezone()}`],
            ["OneNews cron enabled", newsCronEnabled() ? "Enabled" : "Missing"],
            ["OneNews approval required", newsRequireApproval() ? "Enabled" : "Off"],
            ["OneNews source mode", newsSourceMode()],
            ["OneFilm cron enabled", filmCronEnabled() ? "Enabled" : "Missing"],
            ["OneFilm approval required", filmRequireApproval() ? "Enabled" : "Off"],
            ["OneFilm source mode", filmSourceMode()],
            ["Last cron run", "Not tracked yet"],
            ["Next cron run", "Not tracked by current schema"],
          ]}
        />
        <ConfigCard
          title="Public URLs / waitlist"
          rows={[
            ["PUBLIC_BASE_URL", process.env.PUBLIC_BASE_URL ? "Configured from environment" : "Fallback to https://oneread.app"],
            ["POLAR_SUCCESS_URL", configured(process.env.POLAR_SUCCESS_URL)],
            ["TALLY_WAITLIST_URL", WAITLIST_FORM_URL ? "Configured" : "Missing"],
            ["Waitlist counts", "External source not connected"],
          ]}
        />
      </div>

      <AdminCard title="Launch readiness" subtitle={`${passCount}/${readiness.length} pass`}>
        <AdminTable
          head={["Variable", "Status", "Explanation"]}
          rows={readiness.map((c) => [
            <span key="k" className="font-mono text-[11.5px] text-ash">{c.key}</span>,
            <StatusBadge key="s" value={c.status.toUpperCase()} tone={tone(c.status)} />,
            <span key="e" className="text-[12.5px] text-ink/80">{c.explanation}</span>,
          ])}
        />
      </AdminCard>

      <p className="text-[12.5px] text-fog font-sans">
        Secret values are never shown here — only whether each integration is
        configured. Update them through your hosting provider&apos;s environment
        settings.
      </p>
    </AdminShell>
  );
}

function configured(value: string | undefined): string {
  return value && value.trim() ? "Configured" : "Missing";
}

function ConfigCard({
  title,
  rows,
}: {
  title: string;
  rows: readonly (readonly [string, string])[];
}) {
  return (
    <AdminCard title={title} subtitle="Secret values hidden">
      <DefList
        rows={rows.map(([key, value]) => [
          <span key="k" className="font-mono text-[11.5px] text-ash">{key}</span>,
          <StatusBadge
            key="v"
            value={value}
            tone={
              value === "Configured" || value === "Enabled" || value === "Provider default"
                ? "good"
                : value.includes("Missing") || value.includes("Development")
                  ? "wait"
                  : "muted"
            }
          />,
        ])}
      />
    </AdminCard>
  );
}
