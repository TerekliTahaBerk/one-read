"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DAYS = [
  ["MON", "Mon"], ["TUE", "Tue"], ["WED", "Wed"], ["THU", "Thu"],
  ["FRI", "Fri"], ["SAT", "Sat"], ["SUN", "Sun"],
] as const;

export function ScheduleDaysField({ settingKey, initial, label }: { settingKey: string; initial: string; label: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(() => new Set(initial.split(",").filter(Boolean)));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  function toggle(day: string) {
    setSelected((current) => { const next = new Set(current); next.has(day) ? next.delete(day) : next.add(day); return next; });
    setState("idle");
  }
  async function save() {
    if (selected.size === 0) { setState("error"); return; }
    setState("saving");
    const value = DAYS.map(([code]) => code).filter((d) => selected.has(d)).join(",");
    try {
      const response = await fetch("/api/admin/settings/action", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set", key: settingKey, value }) });
      if (!response.ok) throw new Error();
      setState("saved"); router.refresh();
    } catch { setState("error"); }
  }
  return <fieldset className="rounded-xl border border-admin-line bg-admin-surface/60 p-3">
    <legend className="px-1 text-[11px] uppercase tracking-eyebrow text-admin-muted">{label}</legend>
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map(([code, short]) => <button key={code} type="button" aria-pressed={selected.has(code)} onClick={() => toggle(code)}
        className={`h-8 min-w-10 rounded-lg border px-2 text-[12px] ${selected.has(code) ? "border-admin-accent bg-admin-accent text-white" : "border-admin-line-strong bg-white text-admin-body"}`}>{short}</button>)}
    </div>
    <div className="mt-3 flex items-center gap-2">
      <button type="button" onClick={save} disabled={state === "saving"} className="rounded-lg border border-admin-line-strong px-3 py-1.5 text-[12px] text-admin-ink disabled:opacity-50">{state === "saving" ? "Saving…" : "Save days"}</button>
      <span role="status" aria-live="polite" className={`text-[11.5px] ${state === "error" ? "text-dawn" : "text-admin-muted"}`}>{state === "saved" ? "Saved" : state === "error" ? "Choose at least one day" : "07:00 Europe/Istanbul"}</span>
    </div>
  </fieldset>;
}
