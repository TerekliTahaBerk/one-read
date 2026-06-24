"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArticleBulkActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function rescorePending() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/one-article/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rescore-pending" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      const r = json.result ?? {};
      setMsg(`Scored ${r.scored ?? 0} · rejected ${r.rejected ?? 0} · failed ${r.failed ?? 0}`);
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={rescorePending}
        className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-ink hover:bg-cream disabled:opacity-40"
      >
        {busy ? "Rescoring..." : "Rescore pending"}
      </button>
      {msg && <span className="text-[11.5px] text-ash">{msg}</span>}
    </div>
  );
}
