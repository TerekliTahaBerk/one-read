"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ArticleActions({
  articleId,
  defaultDate,
  canCreateIssue,
}: {
  articleId: string;
  defaultDate: string;
  canCreateIssue: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [issueDate, setIssueDate] = useState(defaultDate);

  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/one-article/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, articleId, ...extra }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setMsg(`Error: ${json.error ?? "failed"}`);
        return;
      }
      setMsg(labelFor(action, json.result));
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(null);
    }
  }

  const button =
    "rounded-md border border-line bg-paper px-2 py-1 text-[11.5px] text-ink hover:bg-cream disabled:opacity-40";
  const danger =
    "rounded-md border border-dawn/40 bg-paper px-2 py-1 text-[11.5px] text-dawn hover:bg-dawn/5 disabled:opacity-40";

  return (
    <div className="flex max-w-[260px] flex-wrap items-center gap-1.5">
      <button className={button} disabled={!!busy} onClick={() => run("rescore-article")}>
        Rescore
      </button>
      <button className={button} disabled={!!busy} onClick={() => run("mark-candidate")}>
        Candidate
      </button>
      <button
        className={button}
        disabled={!!busy || !canCreateIssue}
        title={canCreateIssue ? "Prepare an issue from this article" : "Article needs scored or manual content first"}
        onClick={() => run("create-issue-from-article", { date: issueDate })}
      >
        Create issue
      </button>
      <input
        type="date"
        value={issueDate}
        onChange={(e) => setIssueDate(e.target.value)}
        className="w-[124px] rounded-md border border-line bg-paper px-2 py-1 text-[11.5px] text-ash"
      />
      <button
        className={danger}
        disabled={!!busy}
        onClick={() => run("reject-article", { reason: "Rejected by admin" })}
      >
        Reject
      </button>
      {msg && <span className="basis-full text-[11px] text-ash">{msg}</span>}
    </div>
  );
}

function labelFor(action: string, result: Record<string, unknown> | undefined): string {
  if (action === "create-issue-from-article") return `Issue ready: ${result?.date ?? ""}`;
  if (action === "rescore-article") return "Rescore complete";
  if (action === "mark-candidate") return "Marked candidate";
  if (action === "reject-article") return "Rejected";
  return "Done";
}
