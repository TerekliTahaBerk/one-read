"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OneArticleOverviewActions() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(action: string) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/one-article/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      const r = json.result ?? {};
      setMsg(
        action === "pipeline-dry-run"
          ? `Dry-run: sent ${r.sends?.sent ?? 0} · skipped ${r.sends?.skipped ?? 0} · failed ${r.sends?.failed ?? 0}`
          : `Prepared ${r.date ?? ""}: ${r.picks ?? 0} issue(s), ${r.summariesReady ?? 0} ready summary row(s)`,
      );
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(null);
    }
  }

  const btn = "rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream disabled:opacity-40";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-[10px] uppercase tracking-eyebrow text-fog font-sans">Prepare only</span>
        <button className={btn} disabled={!!busy} onClick={() => run("prepare-today")}>
          {busy === "prepare-today" ? "Preparing..." : "Generate today's issue"}
        </button>
        <button className={btn} disabled={!!busy} onClick={() => run("prepare-tomorrow")}>
          {busy === "prepare-tomorrow" ? "Preparing..." : "Generate tomorrow's issue"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-24 text-[10px] uppercase tracking-eyebrow text-fog font-sans">Dry run</span>
        <button className={btn} disabled={!!busy} onClick={() => run("pipeline-dry-run")}>
          {busy === "pipeline-dry-run" ? "Running..." : "Pipeline dry-run"}
        </button>
      </div>
      {msg && <p className="text-[12.5px] text-ash font-sans">{msg}</p>}
    </div>
  );
}
