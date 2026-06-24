"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

type Pending = null | "send-now" | "send-test" | "regenerate" | "schedule";

/**
 * Action set for a single issue on the detail page. Approve / schedule are
 * one-click; sending is confirmed. "Send now" shows the recipient count and an
 * explicit warning that real emails may be sent. All requests go through the
 * audited /api/admin/issues/action route.
 */
export function IssueActionsBar({
  pickId,
  dateIso,
  approvalStatus,
  eligibleCount,
  segmentLabel,
  defaultTestEmail,
}: {
  pickId: string;
  dateIso: string;
  approvalStatus: string;
  eligibleCount: number;
  segmentLabel: string;
  defaultTestEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Pending>(null);
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [scheduleDate, setScheduleDate] = useState(dateIso);
  const [sendConfirmation, setSendConfirmation] = useState("");

  async function post(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/issues/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pickId, ...body }),
      });
      const json = await res.json();
      setBusy(false);
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return false;
      }
      if (json.result) {
        setMsg(
          json.result.messageId
            ? `Test sent · provider message id ${json.result.messageId}`
            : `Sent ${json.result.sent} · skipped ${json.result.skipped} · failed ${json.result.failed}`,
        );
      }
      setDialog(null);
      router.refresh();
      return true;
    } catch {
      setBusy(false);
      setMsg("network_error");
      return false;
    }
  }

  const btn = "rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream disabled:opacity-40";
  const danger = "rounded-lg border border-dawn/50 bg-paper px-3 py-1.5 text-[12.5px] text-dawn hover:bg-dawn/5 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <ActionGroup label="Approval">
        <button className={btn} disabled={busy} onClick={() => post({ action: "approve" })}>
          Approve
        </button>
        <button className={btn} disabled={busy} onClick={() => setDialog("schedule")}>
          Schedule for 7 AM
        </button>
        {(approvalStatus === "APPROVED" || approvalStatus === "SCHEDULED") && (
          <button className={btn} disabled={busy} onClick={() => post({ action: "unschedule" })}>
            Unschedule
          </button>
        )}
        <button className={btn} disabled={busy} onClick={() => post({ action: "needs-review" })}>
          Mark needs review
        </button>
        </ActionGroup>
        <ActionGroup label="Test only">
        <button className={btn} disabled={busy} onClick={() => setDialog("send-test")}>
          Send test email
        </button>
        </ActionGroup>
        <ActionGroup label="Prepare only">
        <button className={danger} disabled={busy} onClick={() => setDialog("regenerate")}>
          Regenerate
        </button>
        </ActionGroup>
        <ActionGroup label="Real send">
        <button className={danger} disabled={busy} onClick={() => setDialog("send-now")}>
          Send now to eligible subscribers
        </button>
        </ActionGroup>
      </div>
      {msg && <p className="text-[12.5px] text-ash font-sans">{msg}</p>}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-line-strong bg-paper p-5 shadow-lg">
            {dialog === "send-now" && (
              <>
                <h3 className="font-serif text-[17px] text-ink">Send now</h3>
                <p className="mt-2 text-[13px] text-ash font-sans">
                  This will send the approved issue to eligible OneArticle subscribers
                  in this segment ({segmentLabel}). Users who already received it will
                  be skipped.
                </p>
                <ul className="mt-3 text-[12.5px] text-ink/90 space-y-1">
                  <li>Segment: <strong>{segmentLabel}</strong></li>
                  <li>Eligible recipients: <strong>{eligibleCount}</strong></li>
                  <li className="text-dawn">Real emails may be sent.</li>
                </ul>
                <label className="mt-3 block">
                  <span className="text-[11px] uppercase tracking-eyebrow text-fog font-sans">
                    Type SEND ONEARTICLE NOW
                  </span>
                  <input
                    value={sendConfirmation}
                    onChange={(e) => setSendConfirmation(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
                  />
                </label>
              </>
            )}
            {dialog === "regenerate" && (
              <>
                <h3 className="font-serif text-[17px] text-ink">Regenerate issue</h3>
                <p className="mt-2 text-[13px] text-ash font-sans">
                  Clears the cached summaries for this issue. They will be regenerated
                  on the next pipeline or dry-run. No email is sent.
                </p>
              </>
            )}
            {dialog === "send-test" && (
              <>
                <h3 className="font-serif text-[17px] text-ink">Send test</h3>
                <p className="mt-2 text-[13px] text-ash font-sans">
                  Renders this issue and emails it to one address. No DailySend is written.
                </p>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
                />
              </>
            )}
            {dialog === "schedule" && (
              <>
                <h3 className="font-serif text-[17px] text-ink">Schedule for 7 AM</h3>
                <p className="mt-2 text-[13px] text-ash font-sans">
                  Marks the issue SCHEDULED for 07:00 Europe/Istanbul on the selected
                  date. The existing daily cron sends scheduled, approved issues.
                </p>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="mt-3 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
                />
              </>
            )}
            {msg && <p className="mt-3 text-[12.5px] text-dawn">{msg}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg px-3 py-1.5 text-[12.5px] text-ash hover:text-ink" disabled={busy} onClick={() => { setDialog(null); setMsg(null); }}>
                Cancel
              </button>
              <button
                className={dialog === "send-now" || dialog === "regenerate" ? danger : btn}
                disabled={busy}
                onClick={() => {
                  if (dialog === "send-now") return void post({ action: "send-now", confirmation: sendConfirmation });
                  if (dialog === "regenerate") return void post({ action: "regenerate" });
                  if (dialog === "send-test") return void post({ action: "send-test", email: testEmail });
                  if (dialog === "schedule") return void post({ action: "schedule", date: scheduleDate });
                }}
              >
                {busy ? "Working…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-24 text-[10px] uppercase tracking-eyebrow text-fog font-sans">
        {label}
      </span>
      {children}
    </div>
  );
}
