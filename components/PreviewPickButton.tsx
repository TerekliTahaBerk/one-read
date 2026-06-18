"use client";

import { useState } from "react";

/**
 * Admin-only "Create preview pick" action for demo/manual articles.
 * Dev/demo only — the API rejects this in production. Never sends email.
 */
export function PreviewPickButton({
  articleId,
}: {
  articleId: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string>("");

  const onClick = async () => {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/admin/preview-pick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ articleId }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || !data.ok) {
        setState("error");
        setMsg((data.error as string) ?? `Failed (${res.status})`);
      } else {
        setState("done");
        setMsg("Pick created — generate a summary, then see Email preview.");
      }
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Network error");
    }
  };

  if (state === "done") {
    return <span className="text-[11px] text-ink">✓ {msg}</span>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={onClick}
        disabled={state === "loading"}
        className="px-2 py-1 rounded-md border border-line-strong text-[11px] text-ink hover:bg-cream/60 disabled:opacity-40"
      >
        {state === "loading" ? "…" : "Create preview pick"}
      </button>
      {state === "error" ? (
        <span className="text-[11px] text-dawn">{msg}</span>
      ) : null}
    </span>
  );
}
