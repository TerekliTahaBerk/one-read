"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Compact admin editor for OneArticle preferences. Mirrors the public signup
 * fields and posts to the same validated update-preferences action. Collapsed
 * by default so the detail page stays calm.
 */
export function PreferencesEditor({
  subId,
  interests,
  sourceLanguages,
  summaryLanguages,
  current,
}: {
  subId: string;
  interests: readonly string[];
  sourceLanguages: readonly string[];
  summaryLanguages: readonly string[];
  current: {
    interests: string[];
    sourceLanguage: string | null;
    summaryLanguage: string | null;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(current.interests ?? []);
  const [sourceLanguage, setSourceLanguage] = useState(current.sourceLanguage ?? sourceLanguages[0]);
  const [summaryLanguage, setSummaryLanguage] = useState(current.summaryLanguage ?? summaryLanguages[0]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(label: string) {
    setSelected((cur) =>
      cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label],
    );
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/users/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update-preferences",
        subId,
        interests: selected,
        sourceLanguage,
        summaryLanguage,
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok || !json.ok) {
      setMsg(`Error: ${json.error ?? "failed"}`);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink"
      >
        Edit preferences
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-admin-line bg-admin-surface/60 p-4">
      <div className="mb-3 text-[11px] uppercase tracking-eyebrow text-admin-muted">Interests</div>
      <div className="flex flex-wrap gap-1.5">
        {interests.map((label) => {
          const on = selected.includes(label);
          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(label)}
              className={`rounded-full border px-2.5 py-1 text-[12px] ${
                on ? "border-admin-ink bg-admin-ink text-admin-surface" : "border-admin-line text-admin-body hover:border-admin-line-strong"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Source language</span>
          <select value={sourceLanguage ?? ""} onChange={(e) => setSourceLanguage(e.target.value)} className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-ink">
            {sourceLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-eyebrow text-admin-muted">Summary language</span>
          <select value={summaryLanguage ?? ""} onChange={(e) => setSummaryLanguage(e.target.value)} className="rounded-lg border border-admin-line bg-admin-surface px-2.5 py-1.5 text-[13px] text-admin-ink">
            {summaryLanguages.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
      </div>

      {msg && <p className="mt-3 text-[12.5px] text-dawn">{msg}</p>}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[12.5px] text-admin-body hover:text-admin-ink" disabled={busy}>
          Cancel
        </button>
        <button type="button" onClick={save} disabled={busy || selected.length === 0} className="rounded-lg border border-admin-line-strong px-3 py-1.5 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40">
          {busy ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  );
}
