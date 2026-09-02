"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OneNewsDeliveryActions(props: { issueId: string; failed: number; ambiguous: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function act(action: "retry-failed" | "recover-ambiguous") {
    if (action === "recover-ambiguous" && !window.confirm(
      "Resending an ambiguous delivery may duplicate mail. Confirm that provider history was checked and you accept this risk.",
    )) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/one-news/editorial", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, issueId: props.issueId, confirmDuplicateRisk: action === "recover-ambiguous" }),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      setMessage(result.ok ? "Recovery queued." : (result.error ?? "Recovery failed."));
      if (result.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-3">
    {props.failed > 0 ? <button disabled={busy} onClick={() => act("retry-failed")} className="rounded-lg bg-admin-accent px-3 py-2 text-sm text-white disabled:opacity-50">Retry failed only</button> : null}
    {props.ambiguous > 0 ? <button disabled={busy} onClick={() => act("recover-ambiguous")} className="rounded-lg border border-red-400 px-3 py-2 text-sm text-red-700 disabled:opacity-50">Reconcile ambiguous…</button> : null}
    {message ? <span className="text-sm">{message}</span> : null}
  </div>;
}
