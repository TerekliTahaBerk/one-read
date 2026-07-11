"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuickIssueAction({ endpoint, idKey, id, action, label }: { endpoint: string; idKey: "pickId" | "issueId"; id: string; action: "approve" | "needs-review"; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run() {
    setBusy(true); setFailed(false);
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, [idKey]: id }) });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch { setFailed(true); } finally { setBusy(false); }
  }
  return <button type="button" onClick={run} disabled={busy} title={failed ? "Action failed — try again" : undefined}
    className={`whitespace-nowrap rounded-md border px-2 py-1 text-[11.5px] disabled:opacity-50 ${failed ? "border-dawn text-dawn" : "border-admin-line-strong text-admin-ink hover:bg-admin-sink"}`}>
    {busy ? "Working…" : failed ? "Try again" : label}
  </button>;
}
