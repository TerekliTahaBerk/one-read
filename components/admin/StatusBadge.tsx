import type { ReactNode } from "react";

/**
 * One badge for every status family in the admin: access status, email
 * delivery status, send status, pick/summary editorial status, approval
 * status, and eligibility verdicts. Colors stay subtle and accessible — green
 * for healthy, amber for in-progress/attention-soon, muted red (dawn) for
 * problems, gray for inert/ended.
 */
type Tone = "good" | "wait" | "bad" | "muted" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-200",
  wait: "bg-amber-50 text-amber-700 border-amber-200",
  bad: "bg-paper text-dawn border-dawn/40",
  muted: "bg-cream text-fog border-line",
  neutral: "bg-paper text-ash border-line",
};

const TONE_BY_VALUE: Record<string, Tone> = {
  // Access status
  ACTIVE_PAID: "good",
  ADMIN_OVERRIDE: "good",
  TRIALING: "wait",
  PENDING_PREFERENCES: "wait",
  PENDING_CHECKOUT: "wait",
  PAST_DUE: "bad",
  TRIAL_EXPIRED: "bad",
  EXPIRED: "bad",
  CANCELED: "muted",
  // Email delivery
  SUBSCRIBED: "good",
  UNSUBSCRIBED: "muted",
  SUPPRESSED: "bad",
  // Send status
  SENT: "good",
  QUEUED: "wait",
  FAILED: "bad",
  SKIPPED: "muted",
  // Editorial status
  READY: "good",
  DRAFT: "neutral",
  REJECTED: "bad",
  SCORED: "good",
  PENDING: "wait",
  // Approval status
  APPROVED: "good",
  SCHEDULED: "wait",
};

export function statusTone(value: string): Tone {
  return TONE_BY_VALUE[value] ?? "neutral";
}

export function StatusBadge({
  value,
  tone,
  title,
}: {
  value: ReactNode;
  /** Override the auto-detected tone (e.g. for eligibility yes/no). */
  tone?: Tone;
  title?: string;
}) {
  const resolved =
    tone ?? (typeof value === "string" ? statusTone(value) : "neutral");
  return (
    <span
      title={title}
      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] uppercase tracking-eyebrow whitespace-nowrap ${TONE_CLASS[resolved]}`}
    >
      {value}
    </span>
  );
}

/** Eligibility verdict badge — yes/no with the underlying reason as tooltip. */
export function EligibilityBadge({
  allowed,
  reason,
}: {
  allowed: boolean;
  reason: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <StatusBadge
        value={allowed ? "eligible" : "blocked"}
        tone={allowed ? "good" : "muted"}
        title={reason}
      />
      {!allowed && (
        <span className="font-mono text-[10.5px] text-fog">{reason}</span>
      )}
    </span>
  );
}
