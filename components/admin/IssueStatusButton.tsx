"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Promotes an authored issue DRAFT→READY (or demotes READY→DRAFT) via
 * /api/admin/one-article/action:set-issue-status. Never approves or sends —
 * that stays with the approval workflow on the issue detail page.
 */
export function IssueStatusButton({
  pickId,
  status,
}: {
  pickId: string;
  status: "DRAFT" | "READY";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === "DRAFT" ? "READY" : "DRAFT";

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/one-article/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set-issue-status", pickId, status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="rounded-full border border-admin-line-strong bg-admin-surface px-3 py-1 text-[11.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40"
    >
      {busy ? "…" : next === "READY" ? "Mark ready" : "Back to draft"}
    </button>
  );
}
