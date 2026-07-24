"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PreferencesEditor({
  subId,
  summaryLanguages,
  current,
}: {
  subId: string;
  summaryLanguages: readonly string[];
  current: { summaryLanguage: string | null };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(current.summaryLanguage ?? summaryLanguages[0]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    const response = await fetch("/api/admin/users/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "update-preferences", subId, summaryLanguage: language }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok || !data.ok) {
      setMessage(`Error: ${data.error ?? "failed"}`);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className={button}>Edit reading language</button>;
  }
  return (
    <div className="flex flex-wrap items-end gap-3">
      <label><span className="mb-1 block text-[11px] uppercase tracking-eyebrow text-admin-muted">Reading language</span><select value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-lg border border-admin-line bg-admin-surface px-3 py-2 text-[13px] text-admin-ink">{summaryLanguages.map((item) => <option key={item}>{item}</option>)}</select></label>
      <button type="button" onClick={save} disabled={busy} className={button}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[12.5px] text-admin-muted">Cancel</button>
      {message && <span className="text-[12px] text-rose-700">{message}</span>}
    </div>
  );
}

const button = "rounded-lg border border-admin-line-strong bg-admin-surface px-3 py-2 text-[12.5px] text-admin-ink hover:bg-admin-sink disabled:opacity-40";
