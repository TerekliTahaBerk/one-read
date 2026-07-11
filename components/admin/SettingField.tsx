"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingField({ settingKey, initial, type = "text", min, max, step, label }: {
  settingKey: string; initial: string | number; type?: "text" | "number"; min?: number; max?: number; step?: number; label: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(initial));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function save() {
    setState("saving");
    const parsed = type === "number" ? Number(value) : value;
    try {
      const response = await fetch("/api/admin/settings/action", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set", key: settingKey, value: parsed }),
      });
      if (!response.ok) throw new Error();
      setState("saved"); router.refresh();
    } catch { setState("error"); }
  }
  return <label className="block">
    <span className="mb-1.5 block text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}</span>
    <span className="flex items-center gap-2">
      <input aria-label={label} type={type} min={min} max={max} step={step} value={value}
        onChange={(e) => { setValue(e.target.value); setState("idle"); }}
        className="h-9 min-w-0 flex-1 rounded-lg border border-admin-line-strong bg-white px-3 text-[12.5px] text-admin-ink" />
      <button type="button" onClick={save} disabled={state === "saving"}
        className="h-9 rounded-lg border border-admin-line-strong bg-admin-surface px-3 text-[12px] text-admin-ink disabled:opacity-50">
        {state === "saving" ? "Saving…" : "Save"}
      </button>
    </span>
    {state === "saved" && <span className="text-[11px] text-emerald-700">Saved</span>}
    {state === "error" && <span className="text-[11px] text-rose-700">Invalid value or save failed</span>}
  </label>;
}
