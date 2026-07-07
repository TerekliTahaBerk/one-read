"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function IssueEmptyActions({ dateIso }: { dateIso: string }) {
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
        body: JSON.stringify({ action, date: dateIso }),
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
          : `Prepared ${r.date ?? dateIso}: ${r.picks ?? 0} issue(s), ${r.summariesReady ?? 0} ready summary row(s)`,
      );
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(null);
    }
  }

  const button =
    "rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className={button} disabled={!!busy} onClick={() => run("prepare-date")}>
        {busy === "prepare-date" ? "Preparing..." : "Prepare issue for this date"}
      </button>
      <Link href="/admin/manual-article" className={button}>
        Create issue manually
      </Link>
      <Link href="/admin/one-article/articles" className={button}>
        Choose article
      </Link>
      <button className={button} disabled={!!busy} onClick={() => run("pipeline-dry-run")}>
        {busy === "pipeline-dry-run" ? "Running..." : "Pipeline dry-run"}
      </button>
      {msg && <span className="basis-full text-[12px] text-admin-body">{msg}</span>}
    </div>
  );
}
