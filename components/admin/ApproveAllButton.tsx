"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * One-click bulk approval. POSTs `{ action: "approve-all", date? }` to a
 * product's action endpoint, which approves every ready-to-send item still
 * waiting for review. Keeps the human gate — you press one button instead of
 * approving each item — and reports how many were cleared.
 */
export function ApproveAllButton({
  endpoint,
  date,
  label = "Approve all ready",
}: {
  endpoint: string;
  /** Optional day (YYYY-MM-DD). Omitted → the server uses today. */
  date?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve-all", ...(date ? { date } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      const approved = Number(json.result?.approved ?? 0);
      const skipped = Number(json.result?.skipped ?? 0);
      setMsg(
        approved > 0
          ? `Approved ${approved}. They'll go out at the next send.${skipped ? ` ${skipped} left for review (not ready).` : ""}`
          : skipped > 0
            ? `Nothing approved — ${skipped} item(s) aren't ready yet.`
            : "Nothing was waiting for approval.",
      );
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40"
      >
        {busy ? "Approving…" : label}
      </button>
      {msg && <p className="text-[12.5px] text-admin-body font-sans">{msg}</p>}
    </div>
  );
}
