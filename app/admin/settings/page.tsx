import { guardAdminPage } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminShell, AdminNotConfigured } from "@/components/admin/AdminShell";
import { AdminCard, DefList } from "@/components/admin/AdminCard";
import { AdminTable } from "@/components/admin/AdminTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getLaunchReadiness } from "@/lib/launch-readiness";
import { SEND_HOUR_LOCAL, SEND_TIMEZONE, fmtDateTime } from "@/lib/admin/format";
import { isApprovalRequired } from "@/lib/admin/issues-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /admin/settings — provider / launch-readiness status and operational config.
 * Only reports configured/missing — never reveals secret values.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const guard = guardAdminPage(searchParams);
  if (!guard.ok) return <AdminNotConfigured />;
  const { token } = guard;

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
  warnings.push("Pending-checkout users are never eligible for delivery — this is by design.");

  return (
    <AdminShell token={token} title="Settings" subtitle="Configuration & launch readiness">
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
            ["Admin override subscriptions", String(overrideCount)],
            ["Last successful send", fmtDateTime(lastSend?.sentAt ?? null)],
            [
              "Last failed send",
              lastFailed ? `${fmtDateTime(lastFailed.createdAt)} — ${lastFailed.error ?? ""}` : "—",
            ],
          ]}
        />
      </AdminCard>

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
