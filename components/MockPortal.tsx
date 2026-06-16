"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PortalState {
  status: string;
  plan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const ACTIONS: { key: "cancel" | "resume" | "fail" | "recover"; label: string }[] = [
  { key: "cancel", label: "Cancel at period end" },
  { key: "resume", label: "Resume subscription" },
  { key: "fail", label: "Simulate payment failed" },
  { key: "recover", label: "Simulate payment recovered" },
];

/**
 * Development-only mock billing portal. Each button drives a mock lifecycle
 * transition via /api/subscribe/mock/action. No real provider is involved.
 */
export function MockPortal({ email, initial }: { email: string; initial: PortalState }) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: string) {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/subscribe/mock/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        // Optimistic local reflection of the transition just applied.
        setState((s) => {
          switch (action) {
            case "cancel":
              return { ...s, status: "CANCELED", cancelAtPeriodEnd: true };
            case "resume":
              return { ...s, status: "ACTIVE_PAID", cancelAtPeriodEnd: false };
            case "fail":
              return { ...s, status: "PAST_DUE" };
            case "recover":
              return { ...s, status: "ACTIVE_PAID" };
            default:
              return s;
          }
        });
        router.refresh();
      } else {
        setError(data.error ?? "Action could not be applied.");
      }
    } catch {
      setError("Action could not be applied.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="w-full max-w-[32rem] mx-auto mt-8 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 sm:p-7">
      <p className="font-sans text-[11px] uppercase tracking-eyebrow text-amber-700">
        Development mock billing portal
      </p>

      <dl className="mt-5 space-y-2 font-sans text-[14px]">
        <div className="flex justify-between">
          <dt className="text-ash">Status</dt>
          <dd className="text-ink">{state.status}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ash">Plan</dt>
          <dd className="text-ink">{state.plan ?? "—"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ash">Period ends</dt>
          <dd className="text-ink">
            {state.currentPeriodEnd ? state.currentPeriodEnd.slice(0, 10) : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ash">Cancel at period end</dt>
          <dd className="text-ink">{state.cancelAtPeriodEnd ? "yes" : "no"}</dd>
        </div>
      </dl>

      {error ? <p className="font-sans text-[13px] text-red-600 mt-4">{error}</p> : null}

      <div className="mt-6 flex flex-col gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            onClick={() => run(a.key)}
            disabled={busy !== null}
            className="rounded-xl px-5 py-2.5 font-sans text-[14px] font-medium border border-[var(--theme-border)] text-ink disabled:opacity-40 hover:bg-[var(--theme-selected-surface)]"
          >
            {busy === a.key ? "Working…" : a.label}
          </button>
        ))}
      </div>

      <p className="font-sans text-[12px] text-fog mt-5">
        Refresh after an action to see the updated state.
      </p>
    </div>
  );
}
