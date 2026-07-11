"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Product-level run triggers for OneFilm / OneLingo. "Test run" generates
 * today's content and logs the run without emailing anyone; "Run now" performs
 * the real daily run (honouring the product's approval + test-mode settings)
 * and sends approved content. Both are recorded in run history.
 */
export function ProductRunActions({
  endpoint,
  productName,
  dryRunDisabledReason,
  liveRunDisabledReason,
}: {
  endpoint: string;
  productName: string;
  dryRunDisabledReason?: string | null;
  liveRunDisabledReason?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(action: "run-dry" | "run-live") {
    if (
      action === "run-live" &&
      !window.confirm(
        `Run ${productName} now and send approved content to subscribers? Only content that's approved and ready will go out.`,
      )
    ) {
      return;
    }
    setBusy(action);
    setMsg(null);
    try {
      const res = await fetch(endpoint, {
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
      const sends = r.sends ?? r;
      const segments = r.segments ?? {};
      setMsg(
        action === "run-dry"
          ? `Test run complete — prepared ${r.picks ?? segments.generated ?? 0}; ${sends.dryRun ?? sends.skipped ?? 0} delivery row(s) checked. No emails were sent.`
          : `Run complete — prepared ${r.picks ?? segments.generated ?? 0} · delivered ${sends.sent ?? 0} · skipped ${sends.skipped ?? 0} · failed ${sends.failed ?? 0}.`,
      );
      router.refresh();
    } catch {
      setMsg("network_error");
    } finally {
      setBusy(null);
    }
  }

  const btn =
    "rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={btn} disabled={!!busy || !!dryRunDisabledReason} title={dryRunDisabledReason ?? undefined} onClick={() => run("run-dry")}>
          {busy === "run-dry" ? "Running…" : "Test run (no emails)"}
        </button>
        <button className={btn} disabled={!!busy || !!liveRunDisabledReason} title={liveRunDisabledReason ?? undefined} onClick={() => run("run-live")}>
          {busy === "run-live" ? "Running…" : "Run now (send)"}
        </button>
      </div>
      {(dryRunDisabledReason || liveRunDisabledReason) && (
        <div className="space-y-1 text-[12px] text-admin-muted">
          {dryRunDisabledReason && <p>Test run unavailable: {dryRunDisabledReason}</p>}
          {liveRunDisabledReason && <p>Live run unavailable: {liveRunDisabledReason}</p>}
        </div>
      )}
      {msg && <p role="status" aria-live="polite" className="text-[12.5px] text-admin-body font-sans">{msg}</p>}
    </div>
  );
}
