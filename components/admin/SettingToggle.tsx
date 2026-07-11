"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * A single on/off control backed by the panel settings store. Optimistic, with
 * an optional confirm prompt for the risky direction (e.g. turning automatic
 * sending ON, or turning test-mode OFF, both of which can cause real emails).
 */
export function SettingToggle({
  settingKey,
  initial,
  onLabel = "On",
  offLabel = "Off",
  confirmOn,
  confirmOff,
}: {
  settingKey: string;
  initial: boolean;
  onLabel?: string;
  offLabel?: string;
  /** Confirm text shown before switching OFF→ON. */
  confirmOn?: string;
  /** Confirm text shown before switching ON→OFF. */
  confirmOff?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    const confirmMsg = next ? confirmOn : confirmOff;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    setError(null);
    // Optimistic.
    setOn(next);
    try {
      const res = await fetch("/api/admin/settings/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set", key: settingKey, value: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setOn(!next); // revert
        setError(json.error ?? "failed");
        return;
      }
      router.refresh();
    } catch {
      setOn(!next);
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
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
      <span className="font-sans text-[12.5px] text-admin-body">
        {on ? onLabel : offLabel}
      </span>
      {error && <span className="font-sans text-[11.5px] text-dawn">· {error}</span>}
    </span>
  );
}
