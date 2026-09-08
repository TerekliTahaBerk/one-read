"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * A numeric quality bar backed by the panel settings store.
 *
 * Not optimistic: unlike a toggle, a mistyped threshold is not obvious from the
 * control itself, so the field stays in a visible "saving"/"saved" state and
 * reverts to the server value on rejection.
 */
export function SettingNumber({
  settingKey,
  label,
  initial,
  min,
  max,
  step,
  hint,
}: {
  settingKey: string;
  label: string;
  initial: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(initial));
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const dirty = value !== String(initial);

  async function save() {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
      setState("error");
      setError(`Enter a number between ${min} and ${max}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set", key: settingKey, value: parsed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setValue(String(initial));
        setState("error");
        setError(json.error ?? "failed");
        return;
      }
      setState("saved");
      router.refresh();
    } catch {
      setValue(String(initial));
      setState("error");
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <label className="sr-only" htmlFor={`setting-${settingKey}`}>
        {label}
      </label>
      <input
        id={`setting-${settingKey}`}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={busy}
        onChange={(e) => {
          setValue(e.target.value);
          setState("idle");
          setError(null);
        }}
        className="w-24 rounded-lg border border-admin-line-strong bg-admin-surface px-2.5 py-1.5 text-right font-sans text-[12.5px] text-admin-ink disabled:opacity-50"
      />
      <button
        type="button"
        onClick={save}
        disabled={busy || !dirty}
        className="rounded-lg border border-admin-line-strong bg-admin-surface px-2.5 py-1.5 font-sans text-[12px] text-admin-ink transition-colors hover:bg-admin-sink disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {state === "saved" && !dirty && (
        <span className="font-sans text-[11.5px] text-emerald-700">Saved</span>
      )}
      {error && <span className="font-sans text-[11.5px] text-dawn">{error}</span>}
      {hint && !error && (
        <span className="w-full text-right font-sans text-[11.5px] text-admin-muted">{hint}</span>
      )}
    </div>
  );
}
