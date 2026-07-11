import { adminFeatureFlags, adminLoginConfigured, guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Details } from "@/components/admin/Details";
import { getLaunchReadiness } from "@/lib/launch-readiness";
import { getLlmStatus } from "@/lib/llm";
import { SEND_HOUR_LOCAL, SEND_TIMEZONE, fmtDateTime, fmtAgo } from "@/lib/admin/format";
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
import {
  nextOneArticleSend,
  getOneArticleAiStatus,
  oneArticleCronEnabled,
  oneArticleDryRunForced,
  resendConfigured,
} from "@/lib/admin/one-article-ops";
import { oneReadBillingConfigured } from "@/lib/oneread/config";
import { oneArticleSendDays, oneFilmSendDays } from "@/lib/schedule";

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
  const aiStatus = getLlmStatus();
  const oneArticleAi = getOneArticleAiStatus();

  // Next scheduled send date (04:00 UTC = 07:00 Europe/Istanbul).
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const today4 = new Date(`${todayIso}T04:00:00Z`);
  const nextSendDate = new Date(now < today4 ? `${todayIso}T00:00:00Z` : Date.now() + 24 * 60 * 60 * 1000);
  nextSendDate.setUTCHours(0, 0, 0, 0);

  const [lastSend, lastFailed, overrideCount, approvedNext, lastOneArticleRun] = await Promise.all([
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
    prisma.operationalRun.findFirst({
      where: { productKey: "one-article" },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const approvalRequired = isApprovalRequired();
  const flags = adminFeatureFlags();
  const tone = (s: string): "good" | "muted" => (s === "pass" ? "good" : "muted");

  // Plain-language notices — actionable, never alarmist, no env-var names.
  const warnings: string[] = [];
  if (approvalRequired && approvedNext === 0) {
    warnings.push("No OneArticle issue is approved for the next scheduled send. With approval on, nothing will go out until you approve one.");
  }
  if (process.env.POLAR_SERVER === "production" && process.env.NODE_ENV !== "production") {
    warnings.push("Payments are pointed at the live/production account while the app itself isn't in production mode.");
  }
  if (process.env.BILLING_PROVIDER === "polar" && !process.env.POLAR_WEBHOOK_SECRET) {
    warnings.push("Payment webhooks can't be verified yet — the signing secret is missing.");
  }
  if (overrideCount > 0) {
    warnings.push(`${overrideCount} subscription(s) have manual access and receive email regardless of payment.`);
  }
  if (!adminLoginConfigured()) {
    warnings.push("Admin login isn't fully set up yet.");
  }
  if (process.env.ADMIN_TOKEN === "dev-admin-local-7Qk2") {
    warnings.push("A development admin token is still in use — set a strong value before launch.");
  }
  if (process.env.ADMIN_PASSWORD === "taha123") {
    warnings.push("A development admin password is still in use — set a strong value before launch.");
  }
  if (!flags.mutationsEnabled) {
    warnings.push("Admin edits are turned off right now.");
  }
  if (!flags.sendActionsEnabled) {
    warnings.push("Manual send actions are turned off right now.");
  }
  if (oneArticleAi.blocker) {
    warnings.push("The AI brain needs setup before it can generate content.");
  }
  if (!oneArticleCronEnabled()) {
    warnings.push("OneArticle automatic sending is off — scheduled emails won't send.");
  }
  if (oneArticleDryRunForced()) {
    warnings.push("OneArticle is in test mode — the daily run won't send real emails.");
  }
  if (!emailVerificationSecretConfigured()) {
    warnings.push("Email verification isn't set up yet — new signups can't confirm their address.");
  } else if (!verificationEmailConfigured()) {
    warnings.push("Email verification is set up but email sending is missing — codes only show in server logs.");
  }
  if (!lingoBillingConfigured()) {
    warnings.push("OneLingo checkout is disabled until its payment product is set.");
  }
  if (!lingoCronEnabled()) {
    warnings.push("OneLingo automatic sending is off.");
  }
  if (!filmBillingConfigured()) {
    warnings.push("OneFilm checkout is disabled until its payment product is set.");
  }
  if (!filmCronEnabled()) {
    warnings.push("OneFilm automatic sending is off.");
  }
  if (!oneReadBillingConfigured()) {
    warnings.push("OneRead bundle checkout is disabled until its payment product is set.");
  }
  warnings.push("Reminder: people mid-signup or mid-checkout never receive email until they finish — this is intentional.");

  const verifyCfg = verificationConfig();

  const setupRows: [string, boolean][] = [
    ["Email sending", resendConfigured()],
    ["AI brain (content generation)", oneArticleAi.productionReady],
    ["Payments", oneReadBillingConfigured()],
    ["Email verification", emailVerificationSecretConfigured() && verificationEmailConfigured()],
    [
      "Admin security",
      adminLoginConfigured() &&
        process.env.ADMIN_TOKEN !== "dev-admin-local-7Qk2" &&
        process.env.ADMIN_PASSWORD !== "taha123",
    ],
  ];

  const sendingRows: [string, boolean][] = [
    ["OneArticle automatic sending", oneArticleCronEnabled()],
    ["OneFilm automatic sending", filmCronEnabled()],
    ["OneLingo automatic sending", lingoCronEnabled()],
  ];

  return (
    <AdminShell title="Settings" subtitle="What's connected and what needs a look">
      <AdminCard title="Setup" subtitle="Each part of the system, in plain terms" bodyClassName="p-4">
        <DefList
          rows={setupRows.map(([label, ok]) => [
            label,
            <StatusBadge key="v" value={ok ? "Connected" : "Needs setup"} tone={ok ? "good" : "wait"} />,
          ])}
        />
      </AdminCard>

      <AdminCard title="Automatic sending" subtitle="Every delivery goes out at 07:00 Europe/Istanbul" bodyClassName="p-4">
        <DefList
          rows={sendingRows.map(([label, on]) => [
            label,
            <StatusBadge key="v" value={on ? "On" : "Off"} tone={on ? "good" : "muted"} />,
          ])}
        />
      </AdminCard>

      {warnings.length > 0 && (
        <AdminCard title="Needs a look">
          <ul className="divide-y divide-admin-line/70">
            {warnings.map((w, i) => (
              <li key={i} className="px-4 py-2.5 text-[12.5px] text-admin-ink/90 font-sans">
                {w}
              </li>
            ))}
          </ul>
        </AdminCard>
      )}

      <Details summary="Technical details — environment variables, schedule, launch readiness">
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
            ["Last successful send recorded", `${fmtDateTime(lastSend?.sentAt ?? null)} (${fmtAgo(lastSend?.sentAt ?? null)})`],
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
            ["POLAR_ONEREAD_PRODUCT_ID (umbrella)", configured(process.env.POLAR_ONEREAD_PRODUCT_ID)],
            ["POLAR_ONEREAD_SUCCESS_URL", configured(process.env.POLAR_ONEREAD_SUCCESS_URL)],
            ["POLAR_ONEREAD_RETURN_URL", configured(process.env.POLAR_ONEREAD_RETURN_URL)],
            ["POLAR_ONE_ARTICLE_PRODUCT_ID (legacy)", configured(process.env.POLAR_ONE_ARTICLE_PRODUCT_ID)],
            ["POLAR_ONE_LINGO_PRODUCT_ID", configured(process.env.POLAR_ONE_LINGO_PRODUCT_ID || process.env.POLAR_ONELINGO_PRODUCT_ID)],
            ["POLAR_ONE_ARTICLE_SUCCESS_URL", configured(process.env.POLAR_ONE_ARTICLE_SUCCESS_URL || process.env.POLAR_SUCCESS_URL)],
            ["POLAR_ONE_ARTICLE_RETURN_URL", configured(process.env.POLAR_ONE_ARTICLE_RETURN_URL)],
            ["POLAR_ONE_LINGO_SUCCESS_URL", configured(process.env.POLAR_ONE_LINGO_SUCCESS_URL)],
            ["POLAR_ONE_LINGO_RETURN_URL", configured(process.env.POLAR_ONE_LINGO_RETURN_URL)],
            ["POLAR_ONEFILM_PRODUCT_ID (legacy)", configured(process.env.POLAR_ONEFILM_PRODUCT_ID || process.env.POLAR_ONE_FILM_PRODUCT_ID)],
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
          title="AI provider (Gemini brain)"
          rows={[
            ["Production-ready AI", oneArticleAi.productionReady ? "Configured" : oneArticleAi.statusLabel],
            ["AI_PROVIDER", oneArticleAi.selectedProviderLabel],
            ["GEMINI_API_KEY", oneArticleAi.geminiKeyConfigured ? "Configured" : "Missing"],
            ["Gemini active provider", aiStatus.gemini.isActiveProvider ? "Yes" : "No"],
            ["Article scorer", oneArticleAi.scorerEnabled ? "Enabled" : "Blocked"],
            ["Summary generator", oneArticleAi.summaryGeneratorEnabled ? "Enabled" : "Blocked"],
            ["Active model", oneArticleAi.activeModel],
            ["Gemini model (fast)", aiStatus.gemini.models.fast],
            ["Gemini model (quality)", aiStatus.gemini.models.quality],
            ["Gemini model (reasoning)", aiStatus.gemini.models.reasoning],
            ["Gemini temperature default", String(aiStatus.gemini.temperatureDefault)],
            ["Gemini max output tokens", String(aiStatus.gemini.maxOutputTokens)],
            ["OPENAI_API_KEY (fallback)", configured(process.env.OPENAI_API_KEY)],
            ["ANTHROPIC_API_KEY (fallback)", configured(process.env.ANTHROPIC_API_KEY)],
          ]}
        />
        <ConfigCard
          title="Per-product AI brain"
          rows={[
            ["OneArticle", oneArticleAi.statusLabel],
            ["OneLingo", aiBrainStatus(aiStatus)],
            ["OneFilm", `Source mode: ${filmSourceMode()}${aiStatus.gemini.configured ? " · Gemini ready" : ""}`],
          ]}
        />
        <ConfigCard
          title="Cron / scheduling"
          rows={[
            ["CRON_SECRET", configured(process.env.CRON_SECRET)],
            ["Schedule source", "vercel.json cron + environment"],
            ["OneArticle cron enabled", oneArticleCronEnabled() ? "Enabled" : "Disabled"],
            ["OneArticle dry run forced", oneArticleDryRunForced() ? "Enabled" : "Off"],
            ["OneArticle approval required", approvalRequired ? "Enabled" : "Off"],
            ["OneArticle next send", fmtDateTime(nextOneArticleSend().utc)],
            ["OneArticle send days", oneArticleSendDays().join(", ")],
            ["OneFilm send days", oneFilmSendDays().join(", ")],
            ["OneLingo cron enabled", lingoCronEnabled() ? "Enabled" : "Missing"],
            ["OneLingo dry run forced", lingoDryRunForced() ? "Enabled" : "Off"],
            ["OneLingo approval required", lingoRequireApproval() ? "Enabled" : "Off"],
            ["OneLingo send time", `${String(lingoSendHourLocal()).padStart(2, "0")}:00 ${lingoTimezone()}`],
            ["OneFilm cron enabled", filmCronEnabled() ? "Enabled" : "Missing"],
            ["OneFilm approval required", filmRequireApproval() ? "Enabled" : "Off"],
            ["OneFilm source mode", filmSourceMode()],
            ["Last OneArticle run", lastOneArticleRun ? `${fmtDateTime(lastOneArticleRun.startedAt)} · ${lastOneArticleRun.status}` : "Not tracked yet"],
            ["Last OneArticle error", lastOneArticleRun?.error ?? "None tracked"],
          ]}
        />
        <ConfigCard
          title="OneArticle production checklist"
          rows={[
            ["AI_PROVIDER", oneArticleAi.selectedProviderLabel === "gemini" ? "Configured" : oneArticleAi.statusLabel],
            ["GEMINI_API_KEY", oneArticleAi.geminiKeyConfigured ? "Configured" : "Missing"],
            ["GEMINI_MODEL_FAST", aiStatus.gemini.models.fast],
            ["GEMINI_MODEL_QUALITY", aiStatus.gemini.models.quality],
            ["GEMINI_MODEL_REASONING", aiStatus.gemini.models.reasoning],
            ["RESEND_API_KEY", configured(process.env.RESEND_API_KEY)],
            ["CRON_SECRET", configured(process.env.CRON_SECRET)],
            ["ONE_ARTICLE_CRON_ENABLED", oneArticleCronEnabled() ? "Enabled" : "Disabled"],
            ["ONE_ARTICLE_DRY_RUN", oneArticleDryRunForced() ? "Enabled" : "Off"],
            ["ONE_ARTICLE_REQUIRE_APPROVAL", approvalRequired ? "Enabled" : "Off"],
            ["ADMIN_SEND_ACTIONS_ENABLED", flags.sendActionsEnabled ? "Enabled" : "Disabled"],
            ["ADMIN_MUTATIONS_ENABLED", flags.mutationsEnabled ? "Enabled" : "Disabled"],
            ["POLAR_ONE_ARTICLE_PRODUCT_ID", configured(process.env.POLAR_ONE_ARTICLE_PRODUCT_ID)],
            ["POLAR_WEBHOOK_SECRET", configured(process.env.POLAR_WEBHOOK_SECRET)],
            ["DATABASE_URL", configured(process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL)],
            ["Database connected", "Configured"],
          ]}
        />
        <ConfigCard
          title="Public URLs / waitlist"
          rows={[
            ["PUBLIC_BASE_URL", process.env.PUBLIC_BASE_URL ? "Configured from environment" : "Fallback to https://oneread.app"],
            ["OneRead (umbrella) public visibility", "Visible"],
            ["OneArticle public visibility", "Visible — included in OneRead"],
            ["OneFilm public visibility", "Visible — included in OneRead"],
            ["OneLingo public visibility", "Hidden"],
            ["OneDish public visibility", "Hidden"],
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
            <span key="k" className="font-mono text-[11.5px] text-admin-body">{c.key}</span>,
            <StatusBadge key="s" value={c.status.toUpperCase()} tone={tone(c.status)} />,
            <span key="e" className="text-[12.5px] text-admin-ink/80">{c.explanation}</span>,
          ])}
        />
      </AdminCard>

      <p className="text-[12.5px] text-admin-muted font-sans">
        Secret values are never shown here — only whether each integration is
        configured. Update them through your hosting provider&apos;s environment
        settings.
      </p>
      </Details>
    </AdminShell>
  );
}

function configured(value: string | undefined): string {
  return value && value.trim() ? "Configured" : "Missing";
}

function aiBrainStatus(status: ReturnType<typeof getLlmStatus>): string {
  if (status.gemini.configured && status.gemini.isActiveProvider) return "Gemini ready";
  if (status.configured) return `Ready (${status.provider})`;
  return "Heuristic fallback";
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
          <span key="k" className="font-mono text-[11.5px] text-admin-body">{key}</span>,
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
