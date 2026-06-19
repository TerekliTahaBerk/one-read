"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Dialog = null | "schedule" | "send-test" | "send-now" | "regenerate";

export function NewsIssueActionsBar({
  issueId,
  dateIso,
  segmentKey,
  defaultTestEmail,
}: {
  issueId: string;
  dateIso: string;
  segmentKey: string;
  defaultTestEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [testEmail, setTestEmail] = useState(defaultTestEmail);
  const [scheduleDate, setScheduleDate] = useState(dateIso);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/news/issues/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ issueId, ...body }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      setMsg(json.result ? `Sent ${json.result.sent} · skipped ${json.result.skipped} · failed ${json.result.failed}` : "Done");
      setDialog(null);
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(false);
    }
  }

  const btn = "rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream disabled:opacity-40";
  const danger = "rounded-lg border border-dawn/50 bg-paper px-3 py-1.5 text-[12.5px] text-dawn hover:bg-dawn/5 disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={busy} onClick={() => post({ action: "approve" })}>Approve</button>
        <button className={btn} disabled={busy} onClick={() => setDialog("schedule")}>Schedule 7 AM</button>
        <button className={btn} disabled={busy} onClick={() => post({ action: "cancel" })}>Cancel</button>
        <button className={btn} disabled={busy} onClick={() => post({ action: "needs-review" })}>Needs review</button>
        <button className={btn} disabled={busy} onClick={() => setDialog("send-test")}>Send test</button>
        <button className={danger} disabled={busy} onClick={() => setDialog("regenerate")}>Regenerate</button>
        <button className={danger} disabled={busy} onClick={() => setDialog("send-now")}>Send now</button>
      </div>
      {msg && <p className="text-[12.5px] text-ash font-sans">{msg}</p>}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
          <div className="w-full max-w-md rounded-xl border border-line-strong bg-paper p-5 shadow-lg">
            <h3 className="font-serif text-[17px] text-ink">
              {dialog === "send-now" ? "Send now" : dialog === "send-test" ? "Send test" : dialog === "regenerate" ? "Regenerate issue" : "Schedule issue"}
            </h3>
            <p className="mt-2 text-[13px] text-ash font-sans">
              {dialog === "send-now"
                ? `This sends OneNews for segment ${segmentKey}. Existing sent rows are skipped.`
                : dialog === "send-test"
                  ? "Sends this rendered briefing to one address. No send log is written."
                  : dialog === "regenerate"
                    ? "Regenerates the briefing from current source stories. Never fabricates news; if no sources exist it is marked NO_SOURCES."
                    : "Marks this issue as scheduled for 07:00 Europe/Istanbul on the selected date."}
            </p>
            {dialog === "send-test" && (
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="mt-3 w-full rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
              />
            )}
            {dialog === "schedule" && (
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="mt-3 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] text-ink"
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-lg px-3 py-1.5 text-[12.5px] text-ash hover:text-ink" disabled={busy} onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                className={dialog === "send-now" || dialog === "regenerate" ? danger : btn}
                disabled={busy}
                onClick={() => {
                  if (dialog === "send-now") void post({ action: "send-now" });
                  if (dialog === "send-test") void post({ action: "send-test", email: testEmail });
                  if (dialog === "regenerate") void post({ action: "regenerate" });
                  if (dialog === "schedule") void post({ action: "schedule", date: scheduleDate });
                }}
              >
                {busy ? "Working..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
