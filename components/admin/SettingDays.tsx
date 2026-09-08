"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const LABEL: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};

/**
 * Publication-day picker backed by the panel settings store. The store rejects
 * an empty selection, so "no send days" can never be saved by accident — an
 * operator who wants to stop sending uses the dispatch toggle instead, which
 * is auditable as a pause rather than looking like an empty schedule.
 */
export function SettingDays({
  settingKey,
  label,
  initial,
  confirm,
}: {
  settingKey: string;
  label: string;
  /** Comma-separated day codes, e.g. "MON,TUE,WED". */
  initial: string;
  /** Shown before saving, because this changes when real mail goes out. */
  confirm?: string;
}) {
  const router = useRouter();
  const initialSet = initial.split(",").filter(Boolean);
  const [selected, setSelected] = useState<string[]>(initialSet);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const normalized = DAYS.filter((d) => selected.includes(d)).join(",");
  const dirty = normalized !== DAYS.filter((d) => initialSet.includes(d)).join(",");

  function toggle(day: string) {
    setSaved(false);
    setError(null);
    setSelected((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function save() {
    if (selected.length === 0) {
      setError("Select at least one day");
      return;
    }
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set", key: settingKey, value: normalized }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setSelected(initialSet);
        setError(json.error ?? "failed");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setSelected(initialSet);
      setError("network_error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <fieldset className="flex flex-wrap gap-1">
        <legend className="sr-only">{label}</legend>
        {DAYS.map((day) => {
          const on = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={LABEL[day]}
              disabled={busy}
              onClick={() => toggle(day)}
              className={`min-w-[42px] rounded-lg border px-2 py-1.5 font-sans text-[12px] transition-colors disabled:opacity-50 ${
                on
                  ? "border-admin-accent bg-admin-accent-tint font-medium text-admin-ink"
                  : "border-admin-line-strong bg-admin-surface text-admin-muted hover:bg-admin-sink"
              }`}
            >
              {LABEL[day]}
            </button>
          );
        })}
      </fieldset>
      <button
        type="button"
        onClick={save}
        disabled={busy || !dirty}
        className="rounded-lg border border-admin-line-strong bg-admin-surface px-2.5 py-1.5 font-sans text-[12px] text-admin-ink transition-colors hover:bg-admin-sink disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save"}
      </button>
      {saved && !dirty && <span className="font-sans text-[11.5px] text-emerald-700">Saved</span>}
      {error && <span className="font-sans text-[11.5px] text-dawn">{error}</span>}
    </div>
  );
}
