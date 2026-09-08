"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/sources/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) return String(json.error ?? "failed");
    return null;
  } catch {
    return "network_error";
  }
}

/**
 * Enable/disable one feed. A source blocked in code renders as a disabled
 * control with the reason: showing an operable switch that ingestion ignores
 * would be worse than showing none.
 */
export function SourceActiveToggle({
  slug,
  name,
  active,
  blockedInCode,
}: {
  slug: string;
  name: string;
  active: boolean;
  blockedInCode: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (blockedInCode) {
    return (
      <span className="font-sans text-[11.5px] text-admin-muted" title="Disabled in code; the panel cannot enable it">
        Blocked in code
      </span>
    );
  }

  async function toggle() {
    const next = !on;
    if (
      next
      && !window.confirm(`Enable “${name}”? Its articles will be considered in the next ingest run.`)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setOn(next);
    const failure = await post({ action: "set-active", slug, active: next });
    setBusy(false);
    if (failure) {
      setOn(!next);
      setError(failure);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-label={`${name} enabled`}
        aria-checked={on}
        disabled={busy}
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
          on ? "bg-emerald-600" : "bg-admin-line-strong"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="font-sans text-[12px] text-admin-body">{on ? "On" : "Off"}</span>
      {error && <span className="font-sans text-[11.5px] text-dawn">· {error}</span>}
    </span>
  );
}

/** Acknowledge a stored fetch error. The next ingest run rewrites it anyway. */
export function SourceClearErrorButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const failure = await post({ action: "clear-error", slug });
          setBusy(false);
          if (failure) {
            setError(failure);
            return;
          }
          router.refresh();
        }}
        className="rounded-lg border border-admin-line-strong bg-admin-surface px-2 py-1 font-sans text-[11.5px] text-admin-ink transition-colors hover:bg-admin-sink disabled:opacity-40"
      >
        {busy ? "Clearing…" : "Mark reviewed"}
      </button>
      {error && <span className="font-sans text-[11.5px] text-dawn">{error}</span>}
    </span>
  );
}
